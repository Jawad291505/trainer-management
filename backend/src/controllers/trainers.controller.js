import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client } from '../models/index.js'
import { ensureReferralCode } from '../services/referral.service.js'
import { createInvitedUser } from '../services/invite.service.js'

// Shape a Trainer + its User into the flat object the admin Trainers table wants
// (admin/src/services/mockData.js trainers[]).
function flatten(trainer) {
    const u = trainer.user
    // managedBy is populated (Member -> user) on the queries below when present;
    // falls back gracefully to just the id if a caller passes an unpopulated doc.
    const member = trainer.managedBy && typeof trainer.managedBy === 'object' ? trainer.managedBy : null
    return {
        id: String(trainer._id),
        userId: u ? String(u._id) : null,
        name: u?.name,
        email: u?.email,
        avatarColor: u?.avatarColor,
        specialization: trainer.specialization,
        status: trainer.status,
        capacity: trainer.capacity,
        clients: trainer.clientCount,
        availableSlots: Math.max(0, trainer.capacity - trainer.clientCount),
        rating: trainer.rating,
        revenue: trainer.revenue,
        joinDate: trainer.joinDate,
        referralCode: trainer.referralCode,
        managedBy: trainer.managedBy ? String(member?._id || trainer.managedBy) : null,
        // 'in-house' = Admin's own trainers (managedBy null); 'third-party' =
        // belongs to a Member's own team. Purely derived from managedBy, not a
        // stored field, so it can never drift out of sync with reality.
        trainerType: trainer.managedBy ? 'third-party' : 'in-house',
        memberName: member?.user?.name || null,
    }
}

// Populate managedBy -> Member -> user so listings can show which Member a
// third-party trainer belongs to without a second round-trip.
const MANAGED_BY_POPULATE = { path: 'managedBy', populate: { path: 'user', select: 'name' } }

// A member only ever sees/touches trainers assigned to them; guards against
// a member reaching another member's trainer by id.
function assertMemberOwns(req, trainer) {
    if (req.user.role === 'member' && String(trainer.managedBy || '') !== String(req.member?._id)) {
        throw ApiError.forbidden('That trainer is not assigned to you')
    }
}

// GET /api/trainers?status=&search=&member=&type=in-house|third-party
// (admin sees all, optionally filtered by ?member= or ?type=; member sees only their own trainers)
export const listTrainers = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.user.role === 'member') filter.managedBy = req.member._id
    else if (req.query.member) filter.managedBy = req.query.member
    else if (req.query.type === 'in-house') filter.managedBy = null
    else if (req.query.type === 'third-party') filter.managedBy = { $ne: null }

    let trainers = await Trainer.find(filter)
        .populate('user', 'name email avatarColor status')
        .populate(MANAGED_BY_POPULATE)
        .sort({ createdAt: -1 })

    if (req.query.search) {
        const rx = new RegExp(String(req.query.search).trim(), 'i')
        trainers = trainers.filter((t) => rx.test(t.user?.name || '') || rx.test(t.user?.email || ''))
    }
    res.json({ count: trainers.length, items: trainers.map(flatten) })
})

// GET /api/trainers/:id   (admin, the trainer's assigned member, or the trainer themselves)
export const getTrainer = asyncHandler(async (req, res) => {
    const id = req.params.id === 'me' ? req.trainer?._id : req.params.id
    const trainer = await Trainer.findById(id)
        .populate('user', 'name email avatarColor status phone')
        .populate(MANAGED_BY_POPULATE)
    if (!trainer) throw ApiError.notFound('Trainer not found')

    if (req.user.role === 'trainer' && String(trainer._id) !== String(req.trainer._id)) {
        throw ApiError.forbidden()
    }
    assertMemberOwns(req, trainer)

    const clients = await Client.find({ trainer: trainer._id }).populate('user', 'name email avatarColor')
    res.json({ ...flatten(trainer), clientList: clients })
})

// POST /api/trainers   (admin, or member — auto-scoped to that member)
// Provisions the account via the shared invite flow: a temp password is
// generated and emailed through Resend, and the account must set its own
// password on first login (see services/invite.service.js).
export const createTrainer = asyncHandler(async (req, res) => {
    const { name, email, specialization, capacity } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')

    const managedBy = req.user.role === 'member' ? req.member._id : (req.body.memberId || null)
    if (managedBy) {
        const member = req.user.role === 'member' ? req.member : await Member.findById(managedBy)
        if (!member) throw ApiError.notFound('Member not found')
        const currentTrainerCount = await Trainer.countDocuments({ managedBy: member._id })
        if (currentTrainerCount >= member.trainerLimit) {
            throw ApiError.badRequest(
                `This member has reached their trainer limit (${member.trainerLimit}). Increase the limit or remove a trainer first.`,
            )
        }
    }

    const { user, tempPassword, inviteSent, inviteWarning } = await createInvitedUser({
        name,
        email,
        role: 'trainer',
        avatarColor: req.body.avatarColor,
        status: req.body.status || 'active',
    })
    const trainer = await Trainer.create({
        user: user._id,
        specialization,
        capacity: capacity ?? 20,
        status: req.body.status || 'active',
        rating: req.body.rating ?? 5,
        managedBy,
    })
    await ensureReferralCode(trainer)
    await trainer.populate('user', 'name email avatarColor status')
    res.status(201).json({
        ...flatten(trainer),
        ...(inviteSent ? {} : { inviteWarning, tempPassword }),
    })
})

// PATCH /api/trainers/:id   (admin, or the assigned member) — profile, status, capacity, rating
export const updateTrainer = asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.params.id).populate('user', 'name email avatarColor status')
    if (!trainer) throw ApiError.notFound('Trainer not found')
    assertMemberOwns(req, trainer)

    for (const k of ['specialization', 'status', 'rating', 'revenue']) {
        if (req.body[k] !== undefined) trainer[k] = req.body[k]
    }
    if (req.body.capacity !== undefined) {
        if (req.body.capacity < trainer.clientCount) {
            throw ApiError.badRequest(
                `Capacity cannot be below current client count (${trainer.clientCount})`,
            )
        }
        trainer.capacity = req.body.capacity
    }
    await trainer.save()

    if (trainer.user && (req.body.name || req.body.email || req.body.status || req.body.avatarColor)) {
        if (req.body.name) trainer.user.name = req.body.name
        if (req.body.email) trainer.user.email = req.body.email
        if (req.body.avatarColor) trainer.user.avatarColor = req.body.avatarColor
        if (req.body.status) trainer.user.status = req.body.status
        await trainer.user.save()
    }
    res.json(flatten(trainer))
})

// PATCH /api/trainers/:id/capacity   (admin, or the assigned member)  Body: { delta } or { capacity }
// Backs the admin Assignments "Increase capacity" button.
export const adjustCapacity = asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.params.id).populate('user', 'name email avatarColor status')
    if (!trainer) throw ApiError.notFound('Trainer not found')
    assertMemberOwns(req, trainer)

    const next = req.body.capacity != null ? Number(req.body.capacity) : trainer.capacity + Number(req.body.delta || 0)
    if (next < trainer.clientCount) {
        throw ApiError.badRequest(`Capacity cannot be below current client count (${trainer.clientCount})`)
    }
    trainer.capacity = Math.max(0, next)
    await trainer.save()
    res.json(flatten(trainer))
})

// DELETE /api/trainers/:id   (admin, or the assigned member) — also unassigns their clients
export const deleteTrainer = asyncHandler(async (req, res) => {
    const trainer = await Trainer.findById(req.params.id)
    if (!trainer) throw ApiError.notFound('Trainer not found')
    assertMemberOwns(req, trainer)

    await Client.updateMany({ trainer: trainer._id }, { trainer: null })
    await User.findByIdAndDelete(trainer.user)
    await trainer.deleteOne()
    res.json({ ok: true })
})
