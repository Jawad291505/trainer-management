import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Trainer, Client, DailyLog } from '../models/index.js'
import { hashPassword } from '../utils/password.js'
import { env } from '../config/env.js'

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

// GET /api/clients?status=&goal=&plan=&trainer=&search=&unassigned=1
// admin: all;  trainer: only their own (ignores `trainer` query)
export const listClients = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.query.trainer) filter.trainer = req.query.trainer
    if (req.query.unassigned === '1') filter.trainer = null
    if (req.query.status) filter.status = req.query.status
    if (req.query.goal) filter.goal = req.query.goal
    if (req.query.plan) filter.plan = req.query.plan

    let clients = await Client.find(filter)
        .populate('user', 'name email avatarColor phone status')
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
        .sort({ createdAt: -1 })

    if (req.query.search) {
        const rx = new RegExp(String(req.query.search).trim(), 'i')
        clients = clients.filter((c) => rx.test(c.user?.name || '') || rx.test(c.user?.email || ''))
    }
    res.json({ count: clients.length, items: clients.map(flatten) })
})

// GET /api/clients/:id   (admin; trainer if assigned; client if self)
export const getClient = asyncHandler(async (req, res) => {
    const id = req.params.id === 'me' ? req.client?._id : req.params.id
    const client = await Client.findById(id)
        .populate('user', 'name email avatarColor phone status')
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name email avatarColor specialization' } })
    if (!client) throw ApiError.notFound('Client not found')

    if (req.user.role === 'trainer' && String(client.trainer?._id) !== String(req.trainer._id)) {
        throw ApiError.forbidden('That client is not assigned to you')
    }
    if (req.user.role === 'client' && String(client._id) !== String(req.client._id)) {
        throw ApiError.forbidden()
    }
    res.json(flatten(client))
})

// POST /api/clients   (admin) — provision a client account
export const createClient = asyncHandler(async (req, res) => {
    const { name, email, password, goal, plan, trainerId } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')

    if (trainerId) {
        const trainer = await Trainer.findById(trainerId)
        if (!trainer) throw ApiError.notFound('Trainer not found')
        if (trainer.clientCount >= trainer.capacity) throw ApiError.badRequest('Trainer is at full capacity')
    }

    const user = await User.create({
        name,
        email,
        role: 'client',
        passwordHash: await hashPassword(password || env.seedDemoPassword),
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
    res.status(201).json(flatten(client))
})

// PATCH /api/clients/:id   (admin; client may update own goal/weights)
export const updateClient = asyncHandler(async (req, res) => {
    const id = req.params.id === 'me' ? req.client?._id : req.params.id
    const client = await Client.findById(id).populate('user')
    if (!client) throw ApiError.notFound('Client not found')

    const isSelf = req.user.role === 'client' && String(client._id) === String(req.client._id)
    const isTrainer = req.user.role === 'trainer' && req.trainer && String(client.trainer) === String(req.trainer._id)
    if (req.user.role !== 'admin' && !isSelf && !isTrainer) throw ApiError.forbidden()

    const selfFields = ['goal', 'startWeight', 'weight', 'target']
    const trainerFields = [...selfFields, 'waterGoal', 'sleepGoal']
    const adminFields = [...trainerFields, 'plan', 'status', 'progress']
    const allowed = req.user.role === 'admin' ? adminFields : isTrainer ? trainerFields : selfFields
    for (const k of allowed) if (req.body[k] !== undefined) client[k] = req.body[k]

    if (req.user.role === 'admin' && client.user) {
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

// PATCH /api/clients/:id/assign   (admin)  Body: { trainerId | null }
// Backs the admin Assignments page: assign / reassign / unassign + capacity guard.
export const assignClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id).populate('user', 'name')
    if (!client) throw ApiError.notFound('Client not found')

    const nextTrainerId = req.body.trainerId || null
    const prevTrainerId = client.trainer ? String(client.trainer) : null
    if (String(nextTrainerId) === String(prevTrainerId)) return res.json(flatten(client))

    if (nextTrainerId) {
        const trainer = await Trainer.findById(nextTrainerId)
        if (!trainer) throw ApiError.notFound('Trainer not found')
        if (trainer.clientCount >= trainer.capacity) {
            throw ApiError.badRequest('Trainer is at full capacity — increase capacity first')
        }
    }

    client.trainer = nextTrainerId
    await client.save()
    await Promise.all([syncCount(prevTrainerId), syncCount(nextTrainerId)])

    await client.populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
    res.json(flatten(client))
})

// DELETE /api/clients/:id   (admin)
export const deleteClient = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw ApiError.notFound('Client not found')
    const trainerId = client.trainer ? String(client.trainer) : null
    await User.findByIdAndDelete(client.user)
    await client.deleteOne()
    await syncCount(trainerId)
    res.json({ ok: true })
})
