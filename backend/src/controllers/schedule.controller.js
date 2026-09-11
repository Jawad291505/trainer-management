import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ScheduleActivity, Client, Notification, DailyLog } from '../models/index.js'
import { WEEK_DAYS } from '../config/constants.js'
import { getIo, userRoom } from '../realtime/io.js'

// Map day-of-week scopes to client-friendly 'today'/'upcoming'.
const weekScopeToClient = (scope) => (scope === 'today' ? 'today' : 'upcoming')

// GET /api/schedule   (trainer or client)
//   trainer -> { today: [...], week: { Mon:[...], ... } }
//   client  -> { today: [...], upcoming: [...] }
//     For clients, also includes activities the trainer assigned to them.
export const getSchedule = asyncHandler(async (req, res) => {
    const owner = req.user._id

    if (req.user.role === 'trainer') {
        const rows = await ScheduleActivity.find({ owner }).sort({ time: 1, date: 1 })
        const week = Object.fromEntries(WEEK_DAYS.map((d) => [d, []]))
        const today = []
        for (const r of rows) {
            if (r.scope === 'today') today.push(r)
            else if (week[r.scope]) week[r.scope].push(r)
        }
        return res.json({ today, week })
    }

    // Client: own activities + trainer-assigned activities
    const client = await Client.findOne({ user: owner })
    const filter = { $or: [{ owner }] }
    if (client) {
        filter.$or.push({ client: client._id, ownerRole: 'trainer' })
    }
    const rows = await ScheduleActivity.find(filter).sort({ time: 1, date: 1 })

    res.json({
        today: rows.filter((r) => r.scope === 'today'),
        upcoming: rows.filter((r) => r.scope === 'upcoming' || WEEK_DAYS.includes(r.scope)),
    })
})

// POST /api/schedule
export const addActivity = asyncHandler(async (req, res) => {
    const { title, scope, time, date, notes, type, client: clientId } = req.body
    if (!title || !scope) throw new ApiError(400, 'title and scope are required')

    const data = {
        owner: req.user._id,
        ownerRole: req.user.role,
        title,
        scope,
        time: time || '',
        date: date || null,
        notes: notes || '',
        type: type || 'workout',
    }

    // Trainer can assign an activity to a specific client
    if (req.user.role === 'trainer' && clientId) {
        const client = await Client.findById(clientId)
        if (!client) throw new ApiError(404, 'Client not found')
        data.client = client._id
    }

    const activity = await ScheduleActivity.create(data)

    // Notify client in real-time if trainer created it for them
    if (req.user.role === 'trainer' && data.client) {
        const client = await Client.findById(data.client).populate('user')
        if (client?.user) {
            getIo().to(userRoom(client.user._id)).emit('schedule:new', activity)
            await Notification.create({
                user: client.user._id,
                type: 'schedule',
                title: 'New scheduled activity',
                message: `Your trainer added "${title}" to your schedule.`,
            })
        }
    }

    res.status(201).json(activity)
})

// PATCH /api/schedule/:id
export const updateActivity = asyncHandler(async (req, res) => {
    const activity = await ScheduleActivity.findById(req.params.id)
    if (!activity) throw new ApiError(404, 'Activity not found')

    // Only owner or the trainer who assigned it can update
    const isOwner = activity.owner.toString() === req.user._id.toString()
    const isTrainer = req.user.role === 'trainer'
    if (!isOwner && !isTrainer) throw new ApiError(403, 'Not allowed')

    const allowed = ['title', 'scope', 'time', 'date', 'notes', 'type', 'status', 'done']
    for (const key of allowed) {
        if (req.body[key] !== undefined) activity[key] = req.body[key]
    }
    await activity.save()

    // Sync daily log if done status changed for a client's schedule task
    if (req.body.done !== undefined && req.user.role === 'client') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const log = await DailyLog.findOne({ client: req.client._id, date: today })
        if (log) {
            const task = log.tasks.find((t) => t.key === `sched:${activity._id}`)
            if (task && task.done !== req.body.done) {
                task.done = req.body.done
                await log.save()
                await Client.updateOne({ _id: req.client._id }, { progress: log.completionPct })
            }
        }
    }

    res.json(activity)
})

// DELETE /api/schedule/:id
export const deleteActivity = asyncHandler(async (req, res) => {
    const activity = await ScheduleActivity.findById(req.params.id)
    if (!activity) throw new ApiError(404, 'Activity not found')

    const isOwner = activity.owner.toString() === req.user._id.toString()
    const isTrainer = req.user.role === 'trainer'
    if (!isOwner && !isTrainer) throw new ApiError(403, 'Not allowed')

    await activity.deleteOne()

    res.json({ message: 'Activity deleted' })
})
