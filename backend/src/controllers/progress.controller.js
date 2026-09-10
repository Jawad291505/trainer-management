import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { WeightEntry, DailyLog, Client, DietPlan } from '../models/index.js'

function startOfDay(d = new Date()) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

// Resolve which client the caller is acting on.
async function resolveClientId(req) {
    if (req.user.role === 'client') return req.client._id
    const id = req.query.client || req.body.client || req.params.clientId
    if (!id) throw ApiError.badRequest('client is required')
    if (req.user.role === 'trainer') {
        const client = await Client.findById(id)
        if (!client || String(client.trainer) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Client not assigned to you')
        }
    }
    return id
}

// ---- Weight tracking ----

// GET /api/progress/weight?client=&limit=
export const listWeight = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const limit = Math.min(Number(req.query.limit) || 26, 200)
    const entries = await WeightEntry.find({ client: clientId }).sort({ date: 1 }).limit(limit)

    const client = await Client.findById(clientId)
    const latest = entries.at(-1)?.weightKg ?? client?.weight ?? null
    const start = entries[0]?.weightKg ?? client?.startWeight ?? null

    res.json({
        items: entries,
        summary: {
            startWeight: client?.startWeight ?? start,
            currentWeight: latest,
            targetWeight: client?.target ?? null,
            // user MyProgress.jsx: weightLost = startWeight - weight; toGoal = weight - target
            weightLost: start != null && latest != null ? Math.round((start - latest) * 10) / 10 : null,
            toGoal:
                latest != null && client?.target != null
                    ? Math.round((latest - client.target) * 10) / 10
                    : null,
            goalProgress: client?.progress ?? null,
        },
    })
})

// POST /api/progress/weight   Body: { weightKg, date?, label?, client? }
export const addWeight = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const { weightKg } = req.body
    if (weightKg == null) throw ApiError.badRequest('weightKg is required')

    const entry = await WeightEntry.create({
        client: clientId,
        date: req.body.date ? new Date(req.body.date) : new Date(),
        weightKg,
        label: req.body.label || '',
        source: req.user.role === 'trainer' ? 'trainer' : 'client',
    })
    // Keep the Client's current weight in step for cards/tables.
    await Client.updateOne({ _id: clientId }, { weight: weightKg })
    res.status(201).json(entry)
})

// ---- Daily checklist / adherence ----

// Build today's task list from the client's published diet plan meals + the
// standard water / workout / walk / sleep items the client apps show.
async function seedTasksForClient(clientId) {
    const plan = await DietPlan.findOne({ client: clientId, status: 'published' })
    const mealTasks = (plan?.meals || []).map((m) => ({
        key: `meal:${m._id}`,
        label: `${m.name}${m.time ? ` — ${m.time}` : ''}`,
        type: 'meal',
        time: m.time || '',
        done: false,
        mealId: m._id,
    }))
    return [
        ...mealTasks,
        { key: 'water', label: 'Drink 2L water', type: 'water', time: 'All day', done: false },
        { key: 'workout', label: 'Complete workout', type: 'workout', time: '', done: false },
        { key: 'walk', label: 'Evening walk (30 min)', type: 'walk', time: '', done: false },
        { key: 'sleep', label: '8 hours sleep', type: 'sleep', time: '', done: false },
    ]
}

// GET /api/progress/daily?client=&date=YYYY-MM-DD
export const getDailyLog = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const date = startOfDay(req.query.date ? new Date(req.query.date) : new Date())

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log && req.user.role === 'client') {
        log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId) })
    }
    if (!log) return res.json({ date, tasks: [], completionPct: 0, done: 0, total: 0 })

    const done = log.tasks.filter((t) => t.done).length
    res.json({
        id: String(log._id),
        date: log.date,
        tasks: log.tasks,
        done,
        total: log.tasks.length,
        completionPct: log.completionPct, // user Dashboard getTodayProgress()
    })
})

// PATCH /api/progress/daily   Body: { date?, taskKey, done }   (client)
export const setTask = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())
    const { taskKey, done } = req.body
    if (!taskKey) throw ApiError.badRequest('taskKey is required')

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId) })

    const task = log.tasks.find((t) => t.key === taskKey)
    if (!task) throw ApiError.notFound('Task not found in today\'s log')
    task.done = done ?? !task.done
    await log.save()

    // Roll the day's completion into the Client.progress headline number.
    await Client.updateOne({ _id: clientId }, { progress: log.completionPct })

    res.json({ id: String(log._id), tasks: log.tasks, completionPct: log.completionPct })
})
