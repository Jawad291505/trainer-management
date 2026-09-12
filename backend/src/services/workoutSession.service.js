import { pktStartOfDay, resolveTodayDay } from '../utils/pktTime.js'

// Per-exercise + overall set-completion percentages for a WorkoutSession —
// the "Performance" half of Workout -> Exercise -> Sets -> Completion.
export function summarizeWorkoutSession(session) {
    const exercises = session.exercises.map((ex) => {
        const totalSets = ex.sets.length
        const doneSets = ex.sets.filter((s) => s.completed).length
        return {
            ...(ex.toObject ? ex.toObject() : ex),
            totalSets,
            doneSets,
            completionPct: totalSets ? Math.round((doneSets / totalSets) * 100) : 0,
        }
    })

    const totalSets = exercises.reduce((s, e) => s + e.totalSets, 0)
    const doneSets = exercises.reduce((s, e) => s + e.doneSets, 0)

    return {
        exercises,
        totalSets,
        doneSets,
        completionPct: totalSets ? Math.round((doneSets / totalSets) * 100) : 0,
    }
}

// Weekly completed/partial/missed breakdown for a client's scheduled
// (weekday-recurring) workouts, over the last `weeks` weeks — the trainer's
// "actual performance over time" adherence view.
export async function computeWorkoutAdherence(clientId, weeks, { ExercisePlan, WorkoutSession }) {
    const plan = await ExercisePlan.findOne({ client: clientId, status: 'published' })
    const totalDays = weeks * 7
    const today = pktStartOfDay()
    const since = new Date(today.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000)

    const sessions = plan
        ? await WorkoutSession.find({ client: clientId, date: { $gte: since } }).sort({ createdAt: 1 })
        : []
    // A client may redo a day or log more than one day the same date, so keep
    // the *last* attempt per {date, dayId} — that's the one that determines
    // whether that scheduled day was actually completed.
    const sessionByDateAndDay = new Map(sessions.map((s) => [`${s.date.getTime()}:${s.dayId}`, s]))

    const days = []
    for (let i = 0; i < totalDays; i++) {
        const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
        // `todayDayId` pins "today" to a specific day regardless of weekday (same
        // override startWorkoutSession honors) — only meaningful for the current
        // date, so only apply it there; past dates resolve by weekday alone.
        const isToday = date.getTime() === today.getTime()
        const scheduledDay = plan ? resolveTodayDay(plan.days, isToday ? plan.todayDayId : null, date) : null
        if (!scheduledDay || !scheduledDay.exercises?.length) continue

        const session = sessionByDateAndDay.get(`${date.getTime()}:${scheduledDay._id}`)
        const isPast = date.getTime() < today.getTime()
        let status
        if (session?.status === 'completed') {
            const { completionPct } = summarizeWorkoutSession(session)
            status = completionPct >= 100 ? 'completed' : 'partial'
        } else if (session) {
            status = 'partial'
        } else if (isPast) {
            status = 'missed'
        } else {
            status = 'upcoming'
        }
        days.push({ date, status })
    }

    // Roll into calendar weeks (Sunday-start, matching pktDayName's index 0).
    const weekMap = new Map()
    for (const d of days) {
        const weekStart = new Date(d.date.getTime() - (d.date.getUTCDay() * 24 * 60 * 60 * 1000))
        const key = weekStart.getTime()
        if (!weekMap.has(key)) weekMap.set(key, { weekStart, scheduled: 0, completed: 0, partial: 0, missed: 0 })
        const w = weekMap.get(key)
        w.scheduled += 1
        if (d.status !== 'upcoming') w[d.status] += 1
    }

    const weeklyBreakdown = [...weekMap.values()]
        .sort((a, b) => a.weekStart - b.weekStart)
        .map((w) => ({
            ...w,
            adherencePct: w.scheduled ? Math.round(((w.completed + w.partial * 0.5) / w.scheduled) * 100) : 0,
        }))

    const totals = days.reduce(
        (acc, d) => {
            if (d.status !== 'upcoming') acc[d.status] += 1
            acc.scheduled += 1
            return acc
        },
        { scheduled: 0, completed: 0, partial: 0, missed: 0 },
    )

    return { weeklyBreakdown, totals }
}
