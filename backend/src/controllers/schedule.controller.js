import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ScheduleActivity } from '../models/index.js'
import { WEEK_DAYS } from '../config/constants.js'

// GET /api/schedule   (trainer or client) — returns the caller's own schedule
// shaped like the front-end contexts:
//   trainer -> { today: [...], week: { Mon:[...], ... } }
//   client  -> { today: [...], upcoming: [...] }
export const getSchedule = asyncHandler(async (req, res) => {
    const owner = req.user._id
    const rows = await ScheduleActivity.find({ owner }).sort({ time: 1, date: 1 })

    if (req.user.role === 'trainer') {
        const week = Object.fromEntries(WEEK_DAYS.map((d) => [d, []]))
        const today = []
        for (const r of rows) {
            if (r.scope === 'today') today.push(r)
            else if (week[r.scope]) week[r.scope].push(r)
        }
        return res.json({ today, week })
    }

    res.json({
        today: rows.filter((r) => r.scope === 'today'),
        upcoming: rows.filter((r) => r.scope === 'upcoming'),
    })
})

// POST /api/schedule   Body: { scope, time?, date?, title, type, clientId?, notes? }
export const addActivity = asyncHandler(async (req, res) => {
    const { scope, title, type } = req.body
    if (!scope || !title) throw ApiError.badRequest('scope and title are required')

    const validScopes = req.user.role === 'trainer' ? ['today', ...WEEK_DAYS] : ['today', 'upcoming']
    if (!validScopes.includes(scope)) throw ApiError.badRequest(`scope must be one of: ${validScopes.join(', ')}`)

    const activity = await ScheduleActivity.create({
        owner: req.user._id,
        ownerRole: req.user.role,
        client: req.user.role === 'trainer' ? req.body.clientId || null : null,
        scope,
        time: req.body.time || '',
        date: req.body.date ? new Date(req.body.date) : null,
        title: title.trim(),
        type: type || 'workout',
        notes: req.body.notes || '',
        status: scope === 'today' && req.user.role === 'trainer' ? 'upcoming' : undefined,
    })
    res.status(201).json(activity)
})

// PATCH /api/schedule/:id  — edit, mark done (client) / set status (trainer)
export const updateActivity = asyncHandler(async (req, res) => {
    const a = await ScheduleActivity.findById(req.params.id)
    if (!a) throw ApiError.notFound('Activity not found')
    if (String(a.owner) !== String(req.user._id)) throw ApiError.forbidden()

    for (const k of ['time', 'title', 'type', 'notes', 'status']) {
        if (req.body[k] !== undefined) a[k] = req.body[k]
    }
    if (req.body.date !== undefined) a.date = req.body.date ? new Date(req.body.date) : null
    if (req.body.done !== undefined) a.done = !!req.body.done
    await a.save()
    res.json(a)
})

// DELETE /api/schedule/:id
export const deleteActivity = asyncHandler(async (req, res) => {
    const a = await ScheduleActivity.findById(req.params.id)
    if (!a) throw ApiError.notFound('Activity not found')
    if (String(a.owner) !== String(req.user._id)) throw ApiError.forbidden()
    await a.deleteOne()
    res.json({ ok: true })
})
