import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { WeightEntry, DailyLog, Client, DietPlan, ExercisePlan, ScheduleActivity } from '../models/index.js'
import { pktStartOfDay, pktDayName, resolveTodayDay } from '../utils/pktTime.js'
import { assertClientAccess } from '../utils/clientAccess.js'
import { serializeDietPlan } from '../services/dietPlan.service.js'

const startOfDay = pktStartOfDay
const DAY_MS = 24 * 60 * 60 * 1000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Resolve which client the caller is acting on (role-scoped — see clientAccess.js).
async function resolveClientId(req) {
    const client = await assertClientAccess(req, req.query.client || req.body?.client || req.params.clientId)
    return client._id
}

// Strict YYYY-MM-DD -> the PKT day bucket used as DailyLog.date.
function parseDateParam(raw) {
    if (!raw) return startOfDay()
    const d = DATE_RE.test(String(raw)) ? new Date(raw) : null
    if (!d || Number.isNaN(d.getTime())) throw ApiError.badRequest('date must be YYYY-MM-DD')
    return startOfDay(d)
}

// ---- Weight tracking ----

// GET /api/progress/weight?client=&limit=
export const listWeight = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const limit = Math.min(Number(req.query.limit) || 26, 200)
    // Newest N entries, returned oldest-first for charting.
    const entries = (await WeightEntry.find({ client: clientId }).sort({ date: -1 }).limit(limit)).reverse()

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
async function seedTasksForClient(clientId, userId, date = new Date()) {
    const tasks = []

    // 1. That date's meals from the diet plan (day matched in PKT)
    const plan = await DietPlan.findOne({ client: clientId, status: 'published' })
    if (plan) {
        const todayDietDay = resolveTodayDay(plan.days, plan.todayDayId, date)
        if (todayDietDay?.meals?.length) {
            for (const m of todayDietDay.meals) {
                const options = m.options || []
                const selected =
                    options.find((o) => String(o._id) === String(m.selectedOptionId)) || options[0] || null
                tasks.push({
                    key: `meal:${m._id}`,
                    label: `${m.name}${m.time ? ` — ${m.time}` : ''}`,
                    type: 'meal',
                    time: m.time || '',
                    done: false,
                    mealId: m._id,
                    itemsDone: new Array(selected?.items?.length || 0).fill(false),
                })
            }
        }
    }

    // 2. That date's workout from the exercise plan (day matched in PKT)
    const exPlan = await ExercisePlan.findOne({ client: clientId, status: 'published' })
    if (exPlan) {
        const todayDay = resolveTodayDay(exPlan.days, exPlan.todayDayId, date)
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

    // 3. That date's schedule activities (scope = 'today' or that weekday)
    const dayShort = pktDayName(date).short
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
        log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id, date) })
    }
    if (!log) return res.json({ date, tasks: [], cheats: [], glucoseReadings: [], completionPct: 0, done: 0, total: 0 })

    const done = log.tasks.filter((t) => t.done).length
    res.json({
        id: String(log._id),
        date: log.date,
        tasks: log.tasks,
        cheats: log.cheats || [],
        glucoseReadings: log.glucoseReadings || [],
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
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id, date) })

    let task = log.tasks.find((t) => t.key === taskKey)
    if (!task) {
        // The plan may have changed since this log was seeded (e.g. the
        // trainer added a meal after today's log already existed) — merge in
        // any newly-available tasks without touching existing completion.
        const freshTasks = await seedTasksForClient(clientId, req.user._id, date)
        const existingKeys = new Set(log.tasks.map((t) => t.key))
        const newTasks = freshTasks.filter((t) => !existingKeys.has(t.key))
        if (newTasks.length) log.tasks.push(...newTasks)
        task = log.tasks.find((t) => t.key === taskKey)
    }
    if (!task) throw ApiError.notFound('Task not found in today\'s log')
    task.done = done ?? !task.done
    await log.save()

    // Roll the day's completion into the Client.progress headline number.
    await Client.updateOne({ _id: clientId }, { progress: log.completionPct })

    res.json({ id: String(log._id), tasks: log.tasks, completionPct: log.completionPct })
})

// PATCH /api/progress/daily/meal-item   Body: { date?, mealId, itemIndex, done }   (client)
// Toggles a single food item within a meal. The meal's own `done` flag is
// derived from itemsDone (true only once every item is checked) so a client
// eating 2 of 3 items shows up as partial everywhere else that reads `done`.
export const setMealItem = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())
    const { mealId, itemIndex, done } = req.body
    if (!mealId) throw ApiError.badRequest('mealId is required')
    if (itemIndex === undefined || itemIndex === null) throw ApiError.badRequest('itemIndex is required')

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id, date) })

    let task = log.tasks.find((t) => String(t.mealId) === String(mealId))
    if (!task) {
        // The plan may have changed since this log was seeded — merge in any
        // newly-available tasks without touching existing completion.
        const freshTasks = await seedTasksForClient(clientId, req.user._id, date)
        const existingMealIds = new Set(log.tasks.filter((t) => t.mealId).map((t) => String(t.mealId)))
        const newTasks = freshTasks.filter((t) => t.mealId && !existingMealIds.has(String(t.mealId)))
        if (newTasks.length) log.tasks.push(...newTasks)
        task = log.tasks.find((t) => String(t.mealId) === String(mealId))
    }
    if (!task) throw ApiError.notFound('Meal not found in today\'s log')

    const itemsDone = Array.isArray(task.itemsDone) ? [...task.itemsDone] : []
    while (itemsDone.length <= itemIndex) itemsDone.push(false)
    itemsDone[itemIndex] = done ?? !itemsDone[itemIndex]
    task.itemsDone = itemsDone
    task.done = itemsDone.length > 0 && itemsDone.every(Boolean)
    log.markModified('tasks')
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
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id, date) })

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

// ---- Blood glucose readings (before/after meal, diabetic clients) ----

// Typical mg/dL reference ranges: pre-meal 70-130, 2h post-meal under 180.
const GLUCOSE_RANGES = {
    before: { low: 70, high: 130 },
    after: { low: 70, high: 180 },
}

function glucoseFlag(phase, valueMgDl) {
    const range = GLUCOSE_RANGES[phase] || GLUCOSE_RANGES.before
    if (valueMgDl < range.low) return 'low'
    if (valueMgDl > range.high) return 'high'
    return 'normal'
}

// POST /api/progress/daily/glucose   Body: { mealId, mealName?, phase, valueMgDl, note?, date? }   (client)
export const logGlucose = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.body.date ? new Date(req.body.date) : new Date())
    const { mealId, mealName, phase, note } = req.body
    const valueMgDl = Number(req.body.valueMgDl)
    if (!mealId) throw ApiError.badRequest('mealId is required')
    if (!['before', 'after'].includes(phase)) throw ApiError.badRequest('phase must be "before" or "after"')
    if (!req.body.valueMgDl && req.body.valueMgDl !== 0) throw ApiError.badRequest('valueMgDl is required')
    if (Number.isNaN(valueMgDl)) throw ApiError.badRequest('valueMgDl must be a number')

    let log = await DailyLog.findOne({ client: clientId, date })
    if (!log) log = await DailyLog.create({ client: clientId, date, tasks: await seedTasksForClient(clientId, req.user._id, date) })

    // One reading per meal per phase — replace if one was already logged today.
    log.glucoseReadings = log.glucoseReadings.filter(
        (g) => !(String(g.mealId) === String(mealId) && g.phase === phase),
    )
    // A reading logged for a past day is stamped at noon of that day, so charts
    // place it on the day it belongs to rather than on the day it was entered.
    const takenAt = date.getTime() === startOfDay().getTime() ? new Date() : new Date(date.getTime() + DAY_MS / 2)
    log.glucoseReadings.push({
        mealId,
        mealName: mealName || '',
        phase,
        valueMgDl,
        note: note || '',
        source: 'client',
        takenAt,
    })
    log.markModified('glucoseReadings')
    await log.save()

    res.status(201).json({ id: String(log._id), glucoseReadings: log.glucoseReadings })
})

// DELETE /api/progress/daily/glucose/:mealId/:phase?date=   (client)
export const removeGlucose = asyncHandler(async (req, res) => {
    const clientId = req.client._id
    const date = startOfDay(req.query.date ? new Date(req.query.date) : new Date())

    const log = await DailyLog.findOne({ client: clientId, date })
    if (!log) throw ApiError.notFound('No log for today')

    log.glucoseReadings = log.glucoseReadings.filter(
        (g) => !(String(g.mealId) === String(req.params.mealId) && g.phase === req.params.phase),
    )
    log.markModified('glucoseReadings')
    await log.save()

    res.json({ id: String(log._id), glucoseReadings: log.glucoseReadings })
})

const round1 = (n) => Math.round(n * 10) / 10

// The instant a reading belongs to, for charting. Legacy readings backdated to
// an earlier day were stamped with the entry time, not the day they describe —
// those fall back to noon of the log's own day.
function readingTime(log, g) {
    const at = g.takenAt ? new Date(g.takenAt) : null
    return at && startOfDay(at).getTime() === log.date.getTime() ? at : new Date(log.date.getTime() + DAY_MS / 2)
}

function flattenGlucose(log) {
    return (log.glucoseReadings || []).map((g) => ({
        id: String(g._id),
        date: log.date,
        mealId: g.mealId,
        mealName: g.mealName,
        phase: g.phase,
        valueMgDl: g.valueMgDl,
        note: g.note,
        source: g.source,
        takenAt: readingTime(log, g),
        flag: glucoseFlag(g.phase, g.valueMgDl),
    }))
}

function summarizeGlucose(items) {
    const avg = (list) => (list.length ? Math.round(list.reduce((s, i) => s + i.valueMgDl, 0) / list.length) : null)
    const values = items.map((i) => i.valueMgDl)
    const outOfRange = items.filter((i) => i.flag !== 'normal').length
    return {
        count: items.length,
        average: avg(items),
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
        outOfRange,
        inRangePct: items.length ? Math.round(((items.length - outOfRange) / items.length) * 100) : null,
        beforeAverage: avg(items.filter((i) => i.phase === 'before')),
        afterAverage: avg(items.filter((i) => i.phase === 'after')),
        latest: items.at(-1) || null,
    }
}

// GET /api/progress/glucose?client=&days=14   — flattened trend for charts/monitoring
// (client: self; trainer: assigned clients; member: their trainers' clients; admin: any)
export const glucoseHistory = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90)
    const since = new Date(startOfDay().getTime() - (days - 1) * DAY_MS)

    const logs = await DailyLog.find({ client: clientId, date: { $gte: since } }).sort({ date: 1 })

    const items = logs.flatMap(flattenGlucose).sort((a, b) => a.takenAt - b.takenAt)

    res.json({ items, days, from: since, ranges: GLUCOSE_RANGES, summary: summarizeGlucose(items) })
})

// Ids of the meals the published plan schedules on `date` (null = no plan/day).
function planMealIdsFor(planDoc, date) {
    if (!planDoc) return null
    const isToday = date.getTime() === startOfDay().getTime()
    const day = resolveTodayDay(planDoc.days, isToday ? planDoc.todayDayId : null, date)
    return day ? new Set(day.meals.map((m) => String(m._id))) : null
}

// A DailyLog keeps a task for every meal it was ever seeded/merged with, so
// after the trainer edits or replaces the plan it still holds tasks for meals
// that are no longer planned — the client can't tick those any more. Drop them
// so totals match what the plan asks for today. The one exception is a past day
// where *none* of the recorded meals are in the current plan (plan fully
// replaced since): there the recorded tasks are the only record of what was
// submitted, so they are kept as-is.
function currentTasks(log, mealIds, isPast) {
    const tasks = log?.tasks || []
    if (!mealIds) return tasks
    const mealTasks = tasks.filter((t) => t.type === 'meal')
    if (isPast && mealTasks.length && !mealTasks.some((t) => mealIds.has(String(t.mealId)))) return tasks
    return tasks.filter((t) => t.type !== 'meal' || mealIds.has(String(t.mealId)))
}

const completionOf = (tasks) => (tasks.length ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0)

// Meal-level adherence from a day's tasks (see currentTasks), i.e. what the
// client actually ticked. A cheat meal still counts towards the planned total
// (its items were on the plan) but never as eaten, so it lowers adherence and is
// also reported separately as `mealsCheat`. `adherencePct` is null when there
// is nothing to measure, so the UI can show "no data" instead of a fake 0%.
function summarizeDietLog(log, tasks = log?.tasks || []) {
    const cheatIds = new Set((log?.cheats || []).map((c) => String(c.mealId)))
    const s = { mealsTotal: 0, mealsDone: 0, mealsPartial: 0, mealsCheat: 0, itemsDone: 0, itemsTotal: 0 }
    for (const t of tasks.filter((t) => t.type === 'meal')) {
        s.mealsTotal += 1
        if (cheatIds.has(String(t.mealId))) {
            s.mealsCheat += 1
            s.itemsTotal += (t.itemsDone || []).length
            continue
        }
        const eaten = (t.itemsDone || []).filter(Boolean).length
        s.itemsDone += eaten
        s.itemsTotal += (t.itemsDone || []).length
        if (t.done) s.mealsDone += 1
        else if (eaten > 0) s.mealsPartial += 1
    }
    return { ...s, adherencePct: s.itemsTotal ? Math.round((s.itemsDone / s.itemsTotal) * 100) : null }
}

// GET /api/progress/daily/history?client=&days=14
// Returns per-day water/sleep/workout/diet completion + overall pct for charts.
// Days the client never opened the app have no DailyLog and are simply absent.
export const dailyHistory = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90)

    // PKT has no DST, so each calendar day is exactly 24h — safe to step back
    // by milliseconds instead of using Date's locale-dependent setDate().
    const since = new Date(startOfDay().getTime() - (days - 1) * DAY_MS)

    const [logs, clientDoc, planDoc] = await Promise.all([
        DailyLog.find({ client: clientId, date: { $gte: since } }).sort({ date: 1 }),
        Client.findById(clientId),
        DietPlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 }),
    ])
    const waterGoal = clientDoc?.waterGoal ?? 2
    const sleepGoal = clientDoc?.sleepGoal ?? 8

    const todayMs = startOfDay().getTime()
    const history = logs.map((log) => {
        const tasks = currentTasks(log, planMealIdsFor(planDoc, log.date), log.date.getTime() < todayMs)
        const diet = summarizeDietLog(log, tasks)
        const glucose = flattenGlucose(log)
        return {
            date: log.date,
            completionPct: completionOf(tasks),
            water: tasks.find((t) => t.key === 'water')?.done || false,
            sleep: tasks.find((t) => t.key === 'sleep')?.done || false,
            workout: tasks.find((t) => t.type === 'workout')?.done || false,
            // Item-level counts let the trainer see partial adherence (e.g. 5 of
            // 8 items eaten) even on days with no fully completed meals.
            mealsDone: diet.mealsDone,
            mealsTotal: diet.mealsTotal,
            mealsPartial: diet.mealsPartial,
            mealsCheat: diet.mealsCheat,
            mealItemsDone: diet.itemsDone,
            mealItemsTotal: diet.itemsTotal,
            dietAdherencePct: diet.adherencePct,
            glucoseCount: glucose.length,
            glucoseOutOfRange: glucose.filter((g) => g.flag !== 'normal').length,
        }
    })

    res.json({ history, goals: { waterGoal, sleepGoal }, days })
})

// GET /api/progress/diet-day?client=&date=YYYY-MM-DD
// Everything the client submitted against their diet plan on one date: the
// plan day that applied, per-meal / per-item completion, cheat meals, glucose
// readings and a summary. Read-only — never creates a DailyLog (unlike the
// client's own /progress/daily), so browsing past dates leaves no trace.
export const getDietDay = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const date = parseDateParam(req.query.date)
    const today = startOfDay()
    const isToday = date.getTime() === today.getTime()
    const isFuture = date.getTime() > today.getTime()

    const [planDoc, log] = await Promise.all([
        DietPlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 }),
        DailyLog.findOne({ client: clientId, date }),
    ])
    const plan = planDoc ? await serializeDietPlan(planDoc) : null
    // Same day-matching rule that seeds the DailyLog (seedTasksForClient).
    const dayDoc = planDoc ? resolveTodayDay(planDoc.days, isToday ? planDoc.todayDayId : null, date) : null
    const planDay = dayDoc ? plan.days.find((d) => d.id === String(dayDoc._id)) : null

    const tasks = currentTasks(log, planMealIdsFor(planDoc, date), !isToday && !isFuture)
    const counted = new Set(tasks.map((t) => t.mealId && String(t.mealId)))
    const cheatByMeal = new Map((log?.cheats || []).map((c) => [String(c.mealId), c]))
    const taskByMeal = new Map((log?.tasks || []).filter((t) => t.type === 'meal').map((t) => [String(t.mealId), t]))
    const glucose = log ? flattenGlucose(log).sort((a, b) => a.takenAt - b.takenAt) : []

    const statusFor = (cheat, done, eaten) => {
        if (cheat) return 'cheat'
        if (done) return 'done'
        if (eaten > 0) return 'partial'
        if (isFuture) return 'upcoming'
        return isToday ? 'pending' : 'missed'
    }

    const planned = { cal: 0, protein: 0, carbs: 0, fat: 0 }
    const eatenTotals = { cal: 0, protein: 0, carbs: 0, fat: 0 }

    const meals = (planDay?.meals || []).map((m) => {
        const task = taskByMeal.get(m.id)
        const cheat = cheatByMeal.get(m.id) || null
        const flags = task?.itemsDone || []
        const items = m.items.map((it, i) => ({
            name: it.name,
            qtyLabel: it.qtyLabel,
            cal: it.cal,
            protein: it.protein,
            carbs: it.carbs,
            fat: it.fat,
            gl: it.gl,
            eaten: !!flags[i],
        }))
        const itemsEaten = items.filter((i) => i.eaten).length
        for (const it of items) {
            for (const k of Object.keys(planned)) {
                planned[k] += it[k] || 0
                if (it.eaten && !cheat) eatenTotals[k] += it[k] || 0
            }
        }
        return {
            id: m.id,
            name: m.name,
            time: m.time,
            notes: m.notes,
            optionLabel: m.options.length > 1 ? m.options.find((o) => o.id === m.selectedOptionId)?.label || null : null,
            items,
            totals: m.totals,
            glLevel: m.mealGLLevel,
            removed: false,
            status: statusFor(cheat, task?.done, itemsEaten),
            itemsEaten,
            cheat: cheat ? { note: cheat.note, items: cheat.items } : null,
            glucose: {
                before: glucose.find((g) => String(g.mealId) === m.id && g.phase === 'before') || null,
                after: glucose.find((g) => String(g.mealId) === m.id && g.phase === 'after') || null,
            },
        }
    })

    // Meals the client logged against that day but the trainer has since
    // removed from the plan — still real submitted data, so still shown.
    const planMealIds = new Set(meals.map((m) => m.id))
    for (const [mealId, task] of taskByMeal) {
        if (planMealIds.has(mealId)) continue
        const cheat = cheatByMeal.get(mealId) || null
        const eaten = (task.itemsDone || []).filter(Boolean).length
        meals.push({
            id: mealId,
            name: task.label.split(' — ')[0],
            time: task.time,
            notes: '',
            optionLabel: null,
            items: [],
            totals: null,
            glLevel: null,
            removed: true,
            // false = a leftover from an earlier version of the plan; shown for
            // reference but excluded from the day's totals.
            counted: counted.has(mealId),
            status: statusFor(cheat, task.done, eaten),
            itemsEaten: eaten,
            itemsTotal: (task.itemsDone || []).length,
            cheat: cheat ? { note: cheat.note, items: cheat.items } : null,
            glucose: {
                before: glucose.find((g) => String(g.mealId) === mealId && g.phase === 'before') || null,
                after: glucose.find((g) => String(g.mealId) === mealId && g.phase === 'after') || null,
            },
        })
    }

    const diet = summarizeDietLog(log, tasks)
    const habits = tasks
        .filter((t) => t.type !== 'meal')
        .map((t) => ({ key: t.key, label: t.label, type: t.type, time: t.time, done: t.done }))

    // "Submitted" = the client actually did something that day (opening the app
    // alone seeds an untouched log, which is not progress).
    const hasActivity = !!log && (
        diet.itemsDone > 0 || diet.mealsCheat > 0 || glucose.length > 0 || habits.some((h) => h.done)
    )

    res.json({
        date,
        weekday: pktDayName(date).full,
        isToday,
        isFuture,
        hasLog: !!log,
        hasActivity,
        plan: planDoc ? { id: String(planDoc._id), title: planDoc.title } : null,
        dayName: dayDoc?.day || null,
        meals: meals.map((m) => ({ ...m, itemsTotal: m.itemsTotal ?? m.items.length })),
        // Planned-vs-eaten macros are only meaningful while every counted meal
        // still exists in the plan (removed meals have no item detail).
        macrosComparable: !meals.some((m) => m.removed && m.counted),
        habits,
        glucose,
        summary: {
            ...diet,
            completionPct: log ? completionOf(tasks) : null,
            planned: { cal: Math.round(planned.cal), protein: round1(planned.protein), carbs: round1(planned.carbs), fat: round1(planned.fat) },
            eaten: { cal: Math.round(eatenTotals.cal), protein: round1(eatenTotals.protein), carbs: round1(eatenTotals.carbs), fat: round1(eatenTotals.fat) },
            glucose: summarizeGlucose(glucose),
        },
        ranges: GLUCOSE_RANGES,
    })
})
