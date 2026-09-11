import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { WeightEntry, DailyLog, Client, DietPlan, ExercisePlan, ScheduleActivity } from '../models/index.js'
import { WEEK_DAYS } from '../config/constants.js'

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

// Build today's task list from real trainer-managed data:
//   1. Meals from the client's published diet plan
//   2. Today's exercises from the published exercise plan
//   3. Today's schedule activities (added by trainer or client)
//   4. Water intake goal
async function seedTasksForClient(clientId, userId) {
    const tasks = []

    // 1. Diet plan meals
    const plan = await DietPlan.findOne({ client: clientId, status: 'published' })
    if (plan?.meals?.length) {
        for (const m of plan.meals) {
            tasks.push({
                key: `meal:${m._id}`,
                label: `${m.name}${m.time ? ` — ${m.time}` : ''}`,
                type: 'meal',
                time: m.time || '',
                done: false,
                mealId: m._id,
            })
        }
    }

    // 2. Today's workout from the exercise plan
    const exPlan = await ExercisePlan.findOne({ client: clientId, status: 'published' })
    if (exPlan) {
        // Match today's day name to a training day, or use todayDayId
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const todayShort = dayNames[new Date().getDay()]
        const todayFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

        let todayDay = null
        if (exPlan.todayDayId) {
            todayDay = exPlan.days.find((d) => String(d._id) === String(exPlan.todayDayId))
        }
        if (!todayDay) {
            todayDay = exPlan.days.find((d) =>
                d.day.toLowerCase() === todayFull.toLowerCase() ||
                d.day.toLowerCase() === todayShort.toLowerCase() ||
                d.day.toLowerCase() === 'today',
            )
        }
        if (todayDay && todayDay.exercises.length) {
            const label = todayDay.focus
                ? `${todayDay.day} workout — ${todayDay.focus}`
                : `${todayDay.day} workout (${todayDay.exercises.length} exercises)`
            tasks.push({
                key: `workout:${todayDay._id}`,
                label,
                type: 'workout',
                time: '',
                done: false,
            })
        }
    }

    // 3. Today's schedule activities (scope = 'today' or today's weekday)
    const dayShort = WEEK_DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
    const schedFilter = {
        $or: [
            { owner: userId, scope: { $in: ['today', dayShort] } },
            { client: clientId, scope: { $in: ['today', dayShort] } },
        ],
    }
    const schedItems = await ScheduleActivity.find(schedFilter).sort({ time: 1 })
    for (const s of schedItems) {
        // Avoid duplicating workout tasks already covered by the exercise plan
        if (s.type === 'workout' && tasks.some((t) => t.type === 'workout')) continue
        tasks.push({
            key: `sched:${s._id}`,
            label: `${s.title}${s.time ? ` — ${s.time}` : ''}`,
            type: s.type || 'checkin',
            time: s.time || '',
            done: s.done || false,
        })
    }

    // 4. Water intake (trainer-set goal)
    const clientDoc = await Client.findById(clientId)
    const litres = clientDoc?.waterGoal ?? 2
    tasks.push({ key: 'water', label: `Drink ${litres}L water`, type: 'water', time: 'All day', done: false })

    // 5. Sleep (trainer-set goal)
    const sleepHrs = clientDoc?.sleepGoal ?? 8
    tasks.push({ key: 'sleep', label: `${sleepHrs} hours sleep`, type: 'sleep', time: 'Night', done: false })

    return tasks
}

// GET /api/progress/daily?client=&date=YYYY-MM-DD
export const getDailyLog = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const date = startOfDay(req.query.date ? new Date(req.query.date) : new Date())

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log && req.user.role === 'client') {
        log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id) })
    }
    if (!log) return res.json({ date, tasks: [], cheats: [], completionPct: 0, done: 0, total: 0 })

    const done = log.tasks.filter((t) => t.done).length
    res.json({
        id: String(log._id),
        date: log.date,
        tasks: log.tasks,
        cheats: log.cheats || [],
        done,
        total: log.tasks.length,
        completionPct: log.completionPct,
    })
})

// PATCH /api/progress/daily   Body: { date?, taskKey, done }   (client)
export const setTask = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())
    const { taskKey, done } = req.body
    if (!taskKey) throw ApiError.badRequest('taskKey is required')

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id) })

    const task = log.tasks.find((t) => t.key === taskKey)
    if (!task) throw ApiError.notFound('Task not found in today\'s log')
    task.done = done ?? !task.done
    await log.save()

    // Roll the day's completion into the Client.progress headline number.
    await Client.updateOne({ _id: clientId }, { progress: log.completionPct })

    res.json({ id: String(log._id), tasks: log.tasks, completionPct: log.completionPct })
})


// ---- Cheat meal logging ----

// POST /api/progress/daily/cheat   Body: { mealId, mealName, note?, items? }
export const logCheat = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())
    const { mealId, mealName, note, items } = req.body
    if (!mealId) throw ApiError.badRequest('mealId is required')

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id) })

    // Remove existing cheat for this meal if any, then add fresh
    log.cheats = log.cheats.filter((c) => String(c.mealId) !== String(mealId))
    log.cheats.push({ mealId, mealName: mealName || '', note: note || '', items: items || [] })

    // Mark the meal task as not done (they went off-plan)
    const mealTask = log.tasks.find((t) => String(t.mealId) === String(mealId))
    if (mealTask) mealTask.done = false
    await log.save()

    await Client.updateOne({ _id: clientId }, { progress: log.completionPct })
    res.json({ id: String(log._id), cheats: log.cheats, tasks: log.tasks, completionPct: log.completionPct })
})

// DELETE /api/progress/daily/cheat/:mealId   — revert to on-plan
export const removeCheat = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.query.date ? new Date(req.query.date) : new Date())

    const log = await DailyLog.findOne({ client: clientId, date })
    if (!log) throw ApiError.notFound('No log for today')

    log.cheats = log.cheats.filter((c) => String(c.mealId) !== String(req.params.mealId))
    await log.save()

    res.json({ id: String(log._id), cheats: log.cheats, tasks: log.tasks, completionPct: log.completionPct })
})

// PATCH /api/progress/daily/cheat/:mealId   — update cheat note/items
export const updateCheat = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())

    const log = await DailyLog.findOne({ client: clientId, date })
    if (!log) throw ApiError.notFound('No log for today')

    const cheat = log.cheats.find((c) => String(c.mealId) === String(req.params.mealId))
    if (!cheat) throw ApiError.notFound('Cheat entry not found')

    if (req.body.note !== undefined) cheat.note = req.body.note
    if (req.body.items !== undefined) cheat.items = req.body.items
    await log.save()

    res.json({ id: String(log._id), cheats: log.cheats })
})

// GET /api/progress/daily/history?client=&days=14
// Returns per-day water/sleep/workout completion + overall pct for charts.
export const dailyHistory = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const days = Math.min(Number(req.query.days) || 14, 90)

    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))

    const logs = await DailyLog.find({ client: clientId, date: { $gte: since } }).sort({ date: 1 })

    const clientDoc = await Client.findById(clientId)
    const waterGoal = clientDoc?.waterGoal ?? 2
    const sleepGoal = clientDoc?.sleepGoal ?? 8

    const history = logs.map((log) => {
        const water = log.tasks.find((t) => t.key === 'water')
        const sleep = log.tasks.find((t) => t.key === 'sleep')
        const workout = log.tasks.find((t) => t.type === 'workout')
        const mealsDone = log.tasks.filter((t) => t.type === 'meal' && t.done).length
        const mealsTotal = log.tasks.filter((t) => t.type === 'meal').length

        return {
            date: log.date,
            completionPct: log.completionPct,
            water: water?.done || false,
            sleep: sleep?.done || false,
            workout: workout?.done || false,
            mealsDone,
            mealsTotal,
        }
    })

    res.json({ history, goals: { waterGoal, sleepGoal }, days })
})
