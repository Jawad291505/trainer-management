import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client, DailyLog } from '../models/index.js'
import { createInvitedUser } from '../services/invite.service.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

function flatten(client) {
    const u = client.user
    const t = client.trainer
    return {
        id: String(client._id),
        userId: u ? String(u._id) : null,
        name: u?.name,
        email: u?.email,
        avatarColor: u?.avatarColor,
        phone: u?.phone,
        role: 'Client',
        goal: client.goal,
        plan: client.plan,
        status: client.status,
        progress: client.progress,
        startWeight: client.startWeight,
        weight: client.weight,
        target: client.target,
        waterGoal: client.waterGoal,
        sleepGoal: client.sleepGoal,
        trainerId: t ? String(t._id || t) : null,
        trainerName: t?.user?.name || null,
        joinDate: client.joinDate,
        lastFollowUp: client.lastFollowUp,
        nextFollowUp: client.nextFollowUp,
    }
}

// Recompute a trainer's denormalised clientCount from the source of truth.
async function syncCount(trainerId) {
    if (!trainerId) return
    const count = await Client.countDocuments({ trainer: trainerId })
    await Trainer.updateOne({ _id: trainerId }, { clientCount: count })
}

// Trainer ids assigned to a member — the scope boundary for all client access below.
async function memberTrainerIds(memberId) {
    const trainers = await Trainer.find({ managedBy: memberId }, '_id')
    return trainers.map((t) => t._id)
}

// GET /api/clients?status=&goal=&plan=&trainer=&search=&unassigned=1&page=&limit=
// admin: all;  member: only clients of their own trainers (may narrow with `trainer`);
// trainer: only their own (ignores `trainer` query)
// Pagination is opt-in (see utils/pagination.js) — other screens load the full list.
export const listClients = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'member') {
        const own = await memberTrainerIds(req.member._id)
        // Narrowing to one trainer must stay inside the member's own scope.
        filter.trainer = { $in: req.query.trainer ? own.filter((id) => String(id) === req.query.trainer) : own }
    } else if (req.query.trainer && req.query.trainer !== 'all') filter.trainer = req.query.trainer
    if (req.query.unassigned === '1') filter.trainer = null
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status
    if (req.query.goal) filter.goal = req.query.goal
    if (req.query.plan) filter.plan = req.query.plan

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        filter.user = { $in: await User.find({ role: 'client', $or: [{ name: rx }, { email: rx }] }).distinct('_id') }
    }

    const paging = pageParams(req.query)
    let query = Client.find(filter)
        .populate('user', 'name email avatarColor phone status')
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1, _id: -1 })
        .lean()
    if (paging) query = query.skip(paging.skip).limit(paging.limit)

    const [clients, total] = await Promise.all([query, paging ? Client.countDocuments(filter) : null])
    const items = clients.map(flatten)
    res.json(paging ? pagedBody(items, total, paging) : { count: items.length, items })
})

// GET /api/clients/:id   (admin; member if one of their trainers; trainer if assigned; client if self)
export const getClient = asyncHandler(async (req, res) => {
    const id = req.params.id === 'me' ? req.client?._id : req.params.id
    const client = await Client.findById(id)
        .populate('user', 'name email avatarColor phone status')
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name email avatarColor specialization' } })
    if (!client) throw ApiError.notFound('Client not found')

    if (req.user.role === 'trainer' && String(client.trainer?._id) !== String(req.trainer._id)) {
        throw ApiError.forbidden('That client is not assigned to you')
    }
    if (req.user.role === 'member' && String(client.trainer?.managedBy || '') !== String(req.member?._id)) {
        throw ApiError.forbidden('That client is outside your scope')
    }
    if (req.user.role === 'client' && String(client._id) !== String(req.client._id)) {
        throw ApiError.forbidden()
    }
    res.json(flatten(client))
})

// Guard: a member may only assign/reassign clients to a trainer within their own scope.
async function assertMemberOwnsTrainer(req, trainerId) {
    if (req.user.role !== 'member' || !trainerId) return
    const trainer = await Trainer.findById(trainerId)
    if (!trainer || String(trainer.managedBy || '') !== String(req.member._id)) {
        throw ApiError.forbidden('That trainer is not assigned to you')
    }
}

// Plan-based cap on total Clients across all of a Member's trainers combined
// (Member.clientLimit, snapshotted from their SubscriptionPlan on approval —
// see memberPayments.controller#approveMemberPayment). Applies regardless of
// who's adding the client (Admin or the Member themselves), since it reflects
// what that Member is actually paying for.
async function assertClientLimit(trainerId) {
    if (!trainerId) return
    const trainer = await Trainer.findById(trainerId, 'managedBy')
    if (!trainer?.managedBy) return
    const member = await Member.findById(trainer.managedBy)
    if (!member) return
    const currentCount = await Client.countDocuments({ trainer: { $in: await memberTrainerIds(member._id) } })
    if (currentCount >= member.clientLimit) {
        throw ApiError.badRequest(
            `This member's plan allows up to ${member.clientLimit} clients — the limit has been reached.`,
        )
    }
}

// POST /api/clients   (admin, or member scoped to their own trainers) — provision
// a client account via the shared invite flow (temp password emailed via Resend).
export const createClient = asyncHandler(async (req, res) => {
    const { name, email, goal, plan, trainerId } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')
    // A Member's client visibility is scoped to `trainer: { $in: their trainers }`
    // (listClients above) — a trainer-less client would be invisible to them
    // forever afterwards, with no way to find or assign it. Admin may still
    // create unassigned "pool" clients since admin sees everyone regardless.
    if (req.user.role === 'member' && !trainerId) {
        throw ApiError.badRequest('Assign a trainer when creating a client — it can be changed later')
    }
    await assertMemberOwnsTrainer(req, trainerId)

    if (trainerId) {
        const trainer = await Trainer.findById(trainerId)
        if (!trainer) throw ApiError.notFound('Trainer not found')
        if (trainer.clientCount >= trainer.capacity) throw ApiError.badRequest('Trainer is at full capacity')
        await assertClientLimit(trainerId)
    }

    const { user, tempPassword, inviteSent, inviteWarning } = await createInvitedUser({
        name,
        email,
        role: 'client',
        avatarColor: req.body.avatarColor,
        status: req.body.status || 'active',
    })
    const client = await Client.create({
        user: user._id,
        trainer: trainerId || null,
        goal,
        plan,
        startWeight: req.body.startWeight,
        weight: req.body.weight,
        target: req.body.target,
        status: req.body.status || 'active',
    })
    await syncCount(trainerId)
    await client.populate([{ path: 'user' }, { path: 'trainer', populate: { path: 'user', select: 'name' } }])
    res.status(201).json({
        ...flatten(client),
        ...(inviteSent ? {} : { inviteWarning, tempPassword }),
    })
})

// PATCH /api/clients/:id   (admin; member if within scope; client may update own goal/weights)
export const updateClient = asyncHandler(async (req, res) => {
    const id = req.params.id === 'me' ? req.client?._id : req.params.id
    const client = await Client.findById(id).populate('user')
    if (!client) throw ApiError.notFound('Client not found')

    const isSelf = req.user.role === 'client' && String(client._id) === String(req.client._id)
    const isTrainer = req.user.role === 'trainer' && req.trainer && String(client.trainer) === String(req.trainer._id)
    const isMember = req.user.role === 'member'
    if (isMember) {
        const trainer = client.trainer && await Trainer.findById(client.trainer)
        if (!trainer || String(trainer.managedBy || '') !== String(req.member._id)) {
            throw ApiError.forbidden('That client is outside your scope')
        }
    }
    if (!['admin', 'member'].includes(req.user.role) && !isSelf && !isTrainer) throw ApiError.forbidden()

    const selfFields = ['goal', 'startWeight', 'weight', 'target']
    const trainerFields = [...selfFields, 'waterGoal', 'sleepGoal']
    const adminFields = [...trainerFields, 'plan', 'status', 'progress']
    const allowed = ['admin', 'member'].includes(req.user.role) ? adminFields : isTrainer ? trainerFields : selfFields
    for (const k of allowed) if (req.body[k] !== undefined) client[k] = req.body[k]

    if (['admin', 'member'].includes(req.user.role) && client.user) {
        if (req.body.name) client.user.name = req.body.name
        if (req.body.email) client.user.email = req.body.email
        if (req.body.status) client.user.status = req.body.status
        if (req.body.phone !== undefined) client.user.phone = req.body.phone
        await client.user.save()
    }
    await client.save()

    // Sync today's daily log if water or sleep goal changed
    if (req.body.waterGoal !== undefined || req.body.sleepGoal !== undefined) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const log = await DailyLog.findOne({ client: client._id, date: today })
        if (log) {
            if (req.body.waterGoal !== undefined) {
                const waterTask = log.tasks.find((t) => t.key === 'water')
                if (waterTask) waterTask.label = `Drink ${req.body.waterGoal}L water`
            }
            if (req.body.sleepGoal !== undefined) {
                const sleepTask = log.tasks.find((t) => t.key === 'sleep')
                if (sleepTask) sleepTask.label = `${req.body.sleepGoal} hours sleep`
            }
            await log.save()
        }
    }

    res.json(flatten(await client.populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })))
})

// PATCH /api/clients/:id/assign   (admin, or member scoped to their own trainers)  Body: { trainerId | null }
// Backs the admin Assignments page: assign / reassign / unassign + capacity guard.
export const assignClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id).populate('user', 'name')
    if (!client) throw ApiError.notFound('Client not found')

    const nextTrainerId = req.body.trainerId || null
    const prevTrainerId = client.trainer ? String(client.trainer) : null
    if (req.user.role === 'member') {
        if (!prevTrainerId) throw ApiError.forbidden('That client is outside your scope')
        await assertMemberOwnsTrainer(req, prevTrainerId)
        if (nextTrainerId) await assertMemberOwnsTrainer(req, nextTrainerId)
    }
    if (String(nextTrainerId) === String(prevTrainerId)) return res.json(flatten(client))

    if (nextTrainerId) {
        const nextTrainer = await Trainer.findById(nextTrainerId)
        if (!nextTrainer) throw ApiError.notFound('Trainer not found')
        if (nextTrainer.clientCount >= nextTrainer.capacity) {
            throw ApiError.badRequest('Trainer is at full capacity — increase capacity first')
        }
        // Only re-check the plan limit if this move actually brings the client
        // into (or between) a member's scope — a lateral move between two
        // trainers under the *same* member doesn't change that member's total.
        const prevTrainer = prevTrainerId ? await Trainer.findById(prevTrainerId, 'managedBy') : null
        const sameMemberScope = nextTrainer.managedBy && prevTrainer?.managedBy
            && String(nextTrainer.managedBy) === String(prevTrainer.managedBy)
        if (!sameMemberScope) await assertClientLimit(nextTrainerId)
    }

    client.trainer = nextTrainerId
    await client.save()
    await Promise.all([syncCount(prevTrainerId), syncCount(nextTrainerId)])

    await client.populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
    res.json(flatten(client))
})

// DELETE /api/clients/:id   (admin, or member scoped to their own trainers)
export const deleteClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw ApiError.notFound('Client not found')
    const trainerId = client.trainer ? String(client.trainer) : null
    if (req.user.role === 'member') {
        if (!trainerId) throw ApiError.forbidden('That client is outside your scope')
        await assertMemberOwnsTrainer(req, trainerId)
    }
    await User.findByIdAndDelete(client.user)
    await client.deleteOne()
    await syncCount(trainerId)
    res.json({ ok: true })
})
