import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { CorrectionRequest, Client, Notification } from '../models/index.js'

// GET /api/corrections?status=&client=
// client: own;  trainer: for their clients;  admin: all
export const listCorrections = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'client') filter.client = req.client._id
    else if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    if (req.query.status) filter.status = req.query.status
    if (req.query.client) filter.client = req.query.client

    const items = await CorrectionRequest.find(filter)
        .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
        .sort({ createdAt: -1 })

    res.json({
        count: items.length,
        openCount: items.filter((r) => r.status === 'open').length,
        items: items.map((r) => ({
            ...r.toObject(),
            clientName: r.client?.user?.name,
            avatarColor: r.client?.user?.avatarColor,
        })),
    })
})

// POST /api/corrections   (client)  Body: { area, item, type, note }
export const createCorrection = asyncHandler(async (req, res) => {
    const { area, item, type, note } = req.body
    if (!area || !type || !note) throw ApiError.badRequest('area, type and note are required')

    const client = await Client.findById(req.client._id)
    if (!client.trainer) throw ApiError.badRequest('You have no assigned trainer to send this to')

    const rq = await CorrectionRequest.create({
        client: client._id,
        trainer: client.trainer,
        area,
        item: item || '',
        type,
        note,
    })
    await Notification.create({
        user: (await client.populate({ path: 'trainer', select: 'user' })).trainer.user,
        role: 'trainer',
        type: 'correction',
        title: 'New correction request',
        description: `${req.user.name}: ${note.slice(0, 80)}`,
        ref: { kind: 'correction', id: rq._id },
    })
    res.status(201).json(rq)
})

// PATCH /api/corrections/:id   (trainer) — resolve / decline / reopen
export const respondCorrection = asyncHandler(async (req, res) => {
    const rq = await CorrectionRequest.findById(req.params.id)
    if (!rq) throw ApiError.notFound('Request not found')
    if (String(rq.trainer) !== String(req.trainer._id)) throw ApiError.forbidden()

    const { action, reply } = req.body
    if (action === 'resolve' || action === 'decline') {
        rq.status = action === 'resolve' ? 'resolved' : 'declined'
        rq.reply = (reply || '').trim()
        rq.resolvedAt = new Date()
    } else if (action === 'reopen') {
        rq.status = 'open'
        rq.reply = ''
        rq.resolvedAt = null
    } else {
        throw ApiError.badRequest('action must be resolve | decline | reopen')
    }
    await rq.save()

    const client = await Client.findById(rq.client)
    await Notification.create({
        user: client.user,
        role: 'client',
        type: 'correction',
        title: `Correction ${rq.status}`,
        description: rq.reply || `Your trainer marked this ${rq.status}.`,
        ref: { kind: 'correction', id: rq._id },
    })
    res.json(rq)
})

// DELETE /api/corrections/:id   (client, only while still open)
export const cancelCorrection = asyncHandler(async (req, res) => {
    const rq = await CorrectionRequest.findById(req.params.id)
    if (!rq) throw ApiError.notFound('Request not found')
    if (String(rq.client) !== String(req.client._id)) throw ApiError.forbidden()
    if (rq.status !== 'open') throw ApiError.badRequest('Only open requests can be cancelled')
    await rq.deleteOne()
    res.json({ ok: true })
})
