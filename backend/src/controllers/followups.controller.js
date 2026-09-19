import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { FollowUp, Client, Trainer } from '../models/index.js'
import { FOLLOWUP_STATUS, FOLLOWUP_TYPES } from '../config/constants.js'
import {
    parseDay, statusOf, bucketFor, initialReminders, serializeFollowUp, populateFollowUp,
    syncClientDates, syncScheduleActivity, removeScheduleActivity,
    notifyFollowUp, followUpLabel, followUpWhen,
} from '../services/followUp.service.js'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

async function assertTrainerOwnsClient(req, clientId) {
    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')
    if (String(client.trainer) !== String(req.trainer._id)) throw ApiError.forbidden('Client not assigned to you')
}

async function loadOwned(req) {
    const fu = await FollowUp.findById(req.params.id).populate(populateFollowUp)
    if (!fu) throw ApiError.notFound('Follow-up not found')
    if (String(fu.trainer._id) !== String(req.trainer._id)) throw ApiError.forbidden()
    return fu
}

const ctx = (req, fu) => ({ trainerUserId: req.trainer.user, clientName: fu.client.user.name })

function validateTime(time) {
    if (time && !TIME_RE.test(time)) throw ApiError.badRequest('time must be HH:mm')
}
function validateType(type) {
    if (type && !FOLLOWUP_TYPES.includes(type)) throw ApiError.badRequest(`type must be one of ${FOLLOWUP_TYPES.join(', ')}`)
}

// GET /api/followups?bucket=&client=&status=
// trainer: own; client: own (privateNote stripped); member: their trainers'; admin: all.
export const listFollowUps = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'client') {
        if (!req.client) return res.json({ count: 0, items: [] })
        filter.client = req.client._id
    } else if (req.user.role === 'member') {
        const trainers = await Trainer.find({ managedBy: req.member._id }, '_id')
        filter.trainer = { $in: trainers.map((t) => t._id) }
    }
    if (req.user.role !== 'trainer' && req.query.trainer) filter.trainer = req.query.trainer
    if (req.user.role !== 'client' && req.query.client) filter.client = req.query.client

    const rows = await FollowUp.find(filter).populate(populateFollowUp).sort({ date: 1, time: 1 })

    // Buckets are derived on read so "overdue" is always accurate.
    let items = rows.map((f) => serializeFollowUp(f, req.user.role))
    if (req.query.bucket) items = items.filter((f) => f.bucket === req.query.bucket)
    if (req.query.status) items = items.filter((f) => f.status === req.query.status)
    res.json({ count: items.length, items })
})

// POST /api/followups   (trainer)  Body: { clientId, date, time?, type?, note?, privateNote? }
export const createFollowUp = asyncHandler(async (req, res) => {
    const { clientId, date, time, type, note, privateNote } = req.body
    if (!clientId || !date) throw ApiError.badRequest('clientId and date are required')
    const day = parseDay(date)
    if (!day) throw ApiError.badRequest('Invalid date')
    validateTime(time)
    validateType(type)
    await assertTrainerOwnsClient(req, clientId)

    const created = await FollowUp.create({
        trainer: req.trainer._id,
        client: clientId,
        date: day,
        time: time || '',
        type: type || 'check-in',
        note: note || '',
        privateNote: privateNote || '',
        reminders: initialReminders(day),
    })
    const fu = await FollowUp.findById(created._id).populate(populateFollowUp)
    fu.bucket = bucketFor(fu)
    await fu.save()

    await syncScheduleActivity(fu, ctx(req, fu))
    await syncClientDates(clientId)
    await notifyFollowUp({
        userId: fu.client.user._id,
        role: 'client',
        title: 'Follow-up scheduled',
        description: `Your trainer scheduled a ${followUpLabel(fu)} for ${followUpWhen(fu)}.`,
        fu,
    })
    res.status(201).json(serializeFollowUp(fu, 'trainer'))
})

// PATCH /api/followups/:id   (trainer)
// Body: any of { date, time, type, note, privateNote, outcome, status }
//   status: 'scheduled' (reopen) | 'completed' (stamps completedAt + client.lastFollowUp) | 'missed'
export const updateFollowUp = asyncHandler(async (req, res) => {
    const fu = await loadOwned(req)
    const { date, time, type, note, privateNote, outcome, status } = req.body

    if (status !== undefined && !FOLLOWUP_STATUS.includes(status)) {
        throw ApiError.badRequest(`status must be one of ${FOLLOWUP_STATUS.join(', ')}`)
    }
    validateTime(time)
    validateType(type)

    const before = { date: fu.date.getTime(), time: fu.time, status: statusOf(fu) }

    if (date !== undefined) {
        const day = parseDay(date)
        if (!day) throw ApiError.badRequest('Invalid date')
        fu.date = day
    }
    if (time !== undefined) fu.time = time
    if (type !== undefined) fu.type = type
    if (note !== undefined) fu.note = note
    if (privateNote !== undefined) fu.privateNote = privateNote
    if (outcome !== undefined) fu.outcome = outcome

    if (status === 'completed') {
        fu.status = 'completed'
        fu.completedAt = fu.completedAt || new Date()
    } else if (status === 'missed') {
        fu.status = 'missed'
        fu.completedAt = null
    } else if (status === 'scheduled') {
        fu.status = 'scheduled'
        fu.completedAt = null
    }

    const rescheduled = fu.date.getTime() !== before.date || fu.time !== before.time
    if (rescheduled) fu.reminders = initialReminders(fu.date)
    fu.bucket = bucketFor(fu)
    await fu.save()

    await syncScheduleActivity(fu, ctx(req, fu))
    await syncClientDates(fu.client._id)

    const after = statusOf(fu)
    if (after === 'scheduled' && rescheduled) {
        await notifyFollowUp({
            userId: fu.client.user._id,
            role: 'client',
            title: 'Follow-up rescheduled',
            description: `Your ${followUpLabel(fu)} is now ${followUpWhen(fu)}.`,
            fu,
        })
    } else if (after === 'completed' && before.status !== 'completed') {
        await notifyFollowUp({
            userId: fu.client.user._id,
            role: 'client',
            title: 'Follow-up completed',
            description: fu.outcome ? fu.outcome.slice(0, 120) : `Your trainer logged your ${followUpLabel(fu)}.`,
            fu,
        })
    }
    res.json(serializeFollowUp(fu, 'trainer'))
})

// DELETE /api/followups/:id   (trainer)
export const deleteFollowUp = asyncHandler(async (req, res) => {
    const fu = await loadOwned(req)
    await removeScheduleActivity(fu)
    await fu.deleteOne()
    await syncClientDates(fu.client._id)
    res.json({ ok: true })
})
