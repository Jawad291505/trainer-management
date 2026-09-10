import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { FollowUp, Client } from '../models/index.js'

// Derive the time-based bucket from a date (trainer FollowUps page groups
// Overdue / Due Today / Upcoming; 'completed' is set explicitly).
function bucketFor(date, completedAt) {
    if (completedAt) return 'completed'
    const d = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    d.setHours(0, 0, 0, 0)
    if (d < today) return 'overdue'
    if (d.getTime() === today.getTime()) return 'today'
    return 'upcoming'
}

async function assertTrainerOwnsClient(req, clientId) {
    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')
    if (String(client.trainer) !== String(req.trainer._id)) throw ApiError.forbidden('Client not assigned to you')
}

// GET /api/followups?bucket=&client=   (trainer: own; client: own; admin: all/by trainer)
export const listFollowUps = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'client') filter.client = req.client._id
    if (req.query.trainer) filter.trainer = req.query.trainer
    if (req.query.client) filter.client = req.query.client

    let items = await FollowUp.find(filter)
        .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
        .sort({ date: 1 })

    // Refresh derived buckets on read so "overdue" is always accurate.
    items = items.map((f) => {
        const bucket = bucketFor(f.date, f.completedAt)
        return { ...f.toObject(), bucket, clientName: f.client?.user?.name, avatarColor: f.client?.user?.avatarColor }
    })
    if (req.query.bucket) items = items.filter((f) => f.bucket === req.query.bucket)
    res.json({ count: items.length, items })
})

// POST /api/followups   (trainer)  Body: { clientId, date, note }
export const createFollowUp = asyncHandler(async (req, res) => {
    const { clientId, date, note } = req.body
    if (!clientId || !date) throw ApiError.badRequest('clientId and date are required')
    await assertTrainerOwnsClient(req, clientId)

    const fu = await FollowUp.create({
        trainer: req.trainer._id,
        client: clientId,
        date: new Date(date),
        note: note || '',
        bucket: bucketFor(date, null),
    })
    await Client.updateOne({ _id: clientId }, { nextFollowUp: new Date(date) })
    res.status(201).json(fu)
})

// PATCH /api/followups/:id   (trainer) — reschedule, edit note, or complete
export const updateFollowUp = asyncHandler(async (req, res) => {
    const fu = await FollowUp.findById(req.params.id)
    if (!fu) throw ApiError.notFound('Follow-up not found')
    if (String(fu.trainer) !== String(req.trainer._id)) throw ApiError.forbidden()

    if (req.body.date !== undefined) fu.date = new Date(req.body.date)
    if (req.body.note !== undefined) fu.note = req.body.note
    if (req.body.completed === true) {
        fu.completedAt = new Date()
        fu.bucket = 'completed'
        await Client.updateOne({ _id: fu.client }, { lastFollowUp: new Date() })
    } else if (req.body.completed === false) {
        fu.completedAt = null
        fu.bucket = bucketFor(fu.date, null)
    } else {
        fu.bucket = bucketFor(fu.date, fu.completedAt)
    }
    await fu.save()
    res.json(fu)
})

// DELETE /api/followups/:id   (trainer)
export const deleteFollowUp = asyncHandler(async (req, res) => {
    const fu = await FollowUp.findById(req.params.id)
    if (!fu) throw ApiError.notFound('Follow-up not found')
    if (String(fu.trainer) !== String(req.trainer._id)) throw ApiError.forbidden()
    await fu.deleteOne()
    res.json({ ok: true })
})
