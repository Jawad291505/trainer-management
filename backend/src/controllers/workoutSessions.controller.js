import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ExercisePlan, WorkoutSession, Client, DailyLog } from '../models/index.js'
import { pktStartOfDay, resolveTodayDay } from '../utils/pktTime.js'
import { summarizeWorkoutSession, computeWorkoutAdherence } from '../services/workoutSession.service.js'

function assertPlanAccess(req, plan) {
    if (req.user.role === 'admin') return
    if (req.user.role === 'trainer' && String(plan.trainer) === String(req.trainer?._id)) return
    if (req.user.role === 'client' && String(plan.client) === String(req.client?._id)) return
    throw ApiError.forbidden('You cannot access this exercise plan')
}

function assertSessionAccess(req, session) {
    if (req.user.role === 'admin') return
    if (req.user.role === 'trainer' && String(session.trainer) === String(req.trainer?._id)) return
    if (req.user.role === 'client' && String(session.client) === String(req.client?._id)) return
    throw ApiError.forbidden('You cannot access this workout session')
}

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

function snapshotExercises(dayExercises = []) {
    return dayExercises.map((ex) => {
        const totalSets = ex.sets || 3
        return {
            planExerciseId: ex._id,
            exercise: ex.exercise || null,
            name: ex.name,
            technique: ex.technique || 'standard',
            trackingType: ex.trackingType || 'reps',
            targetSets: totalSets,
            targetReps: ex.reps || '8-12',
            targetRest: ex.rest || '60s',
            youtube: ex.youtube || '',
            instructions: ex.instructions || '',
            notes: '',
            sets: Array.from({ length: totalSets }, (_, i) => ({
                setNumber: i + 1,
                targetReps: ex.reps || '8-12',
                targetWeight: ex.targetWeight ?? null,
                targetDuration: ex.targetDuration ?? null,
                actualReps: null,
                actualWeight: null,
                actualDuration: null,
                completed: false,
                completedAt: null,
            })),
        }
    })
}

// POST /api/exercise-plans/:id/sessions/start  (client)  Body: { dayId? }
// A client can start (or redo) any training day's workout at any time — not
// just the plan's "today" day, and not just once per calendar day. If an
// in-progress attempt at this exact day already exists today, resume it;
// otherwise always begin a fresh attempt (even if one was already completed
// today), so the client is never locked out of redoing or logging another day.
export const startWorkoutSession = asyncHandler(async (req, res) => {
    const plan = await ExercisePlan.findById(req.params.id)
    if (!plan) throw ApiError.notFound('Exercise plan not found')
    assertPlanAccess(req, plan)
    if (req.user.role !== 'client') throw ApiError.forbidden('Only the client can start a workout')

    const day = req.body.dayId
        ? plan.days.id(req.body.dayId)
        : resolveTodayDay(plan.days, plan.todayDayId)
    if (!day) throw ApiError.badRequest('No training day to start')

    const date = pktStartOfDay()
    const existing = await WorkoutSession.findOne({ client: plan.client, dayId: day._id, date, status: 'in_progress' })
    if (existing) return res.json({ ...existing.toObject(), ...summarizeWorkoutSession(existing) })

    const session = await WorkoutSession.create({
        client: plan.client,
        trainer: plan.trainer,
        exercisePlan: plan._id,
        dayId: day._id,
        day: day.day,
        focus: day.focus,
        dayNote: day.note || '',
        date,
        exercises: snapshotExercises(day.exercises),
    })
    res.status(201).json({ ...session.toObject(), ...summarizeWorkoutSession(session) })
})

// GET /api/exercise-plans/:id/sessions/day/:dayId  -> today's latest attempt
// at this specific day (in_progress or completed), so the UI can show
// Start/Resume/Completed for whichever day is selected, not just "today".
export const getSessionForDay = asyncHandler(async (req, res) => {
    const plan = await ExercisePlan.findById(req.params.id)
    if (!plan) throw ApiError.notFound('Exercise plan not found')
    assertPlanAccess(req, plan)

    const day = plan.days.id(req.params.dayId)
    if (!day) throw ApiError.notFound('Training day not found')

    const date = pktStartOfDay()
    const session = await WorkoutSession.findOne({ client: plan.client, dayId: day._id, date }).sort({ createdAt: -1 })
    if (!session) return res.json({ session: null, day })
    res.json({ session: { ...session.toObject(), ...summarizeWorkoutSession(session) }, day })
})

async function loadSessionOr404(id) {
    const session = await WorkoutSession.findById(id)
    if (!session) throw ApiError.notFound('Workout session not found')
    return session
}

// PATCH /api/workout-sessions/:sessionId/exercises/:exIdx/sets/:setIdx
// Body: { actualReps?, actualWeight?, actualDuration?, completed? }
export const updateSessionSet = asyncHandler(async (req, res) => {
    const session = await loadSessionOr404(req.params.sessionId)
    assertSessionAccess(req, session)

    const ex = session.exercises[Number(req.params.exIdx)]
    if (!ex) throw ApiError.notFound('Exercise not found in session')
    const set = ex.sets[Number(req.params.setIdx)]
    if (!set) throw ApiError.notFound('Set not found in exercise')

    if (req.body.actualReps !== undefined) set.actualReps = req.body.actualReps
    if (req.body.actualWeight !== undefined) set.actualWeight = req.body.actualWeight
    if (req.body.actualDuration !== undefined) set.actualDuration = req.body.actualDuration
    if (req.body.completed !== undefined) {
        set.completed = !!req.body.completed
        set.completedAt = set.completed ? new Date() : null
    }
    await session.save()
    res.json({ ...session.toObject(), ...summarizeWorkoutSession(session) })
})

// PATCH /api/workout-sessions/:sessionId/exercises/:exIdx   Body: { notes }
export const updateSessionExerciseNotes = asyncHandler(async (req, res) => {
    const session = await loadSessionOr404(req.params.sessionId)
    assertSessionAccess(req, session)

    const ex = session.exercises[Number(req.params.exIdx)]
    if (!ex) throw ApiError.notFound('Exercise not found in session')
    ex.notes = req.body.notes || ''
    await session.save()
    res.json({ ...session.toObject(), ...summarizeWorkoutSession(session) })
})

// POST /api/workout-sessions/:sessionId/finish   Body: { notes? }
export const finishWorkoutSession = asyncHandler(async (req, res) => {
    const session = await loadSessionOr404(req.params.sessionId)
    assertSessionAccess(req, session)
    if (req.user.role !== 'client') throw ApiError.forbidden('Only the client can finish a workout')

    session.status = 'completed'
    session.completedAt = new Date()
    if (req.body.notes !== undefined) session.notes = req.body.notes
    await session.save()

    // Mark fully-completed exercises done on the plan (keeps ExerciseDayCard /
    // workoutPct working exactly as before, same flag exercisePlans.controller
    // setExerciseDone already writes).
    const plan = await ExercisePlan.findById(session.exercisePlan)
    if (plan) {
        const day = plan.days.id(session.dayId)
        if (day) {
            for (const sessionEx of session.exercises) {
                if (!sessionEx.planExerciseId) continue
                const planEx = day.exercises.id(sessionEx.planExerciseId)
                if (planEx) planEx.done = sessionEx.sets.every((s) => s.completed)
            }
            await plan.save()

            const log = await DailyLog.findOne({ client: session.client, date: session.date })
            if (log) {
                const workoutTask = log.tasks.find((t) => t.key === `workout:${day._id}`)
                const allDone = day.exercises.every((e) => e.done)
                if (workoutTask && workoutTask.done !== allDone) {
                    workoutTask.done = allDone
                    await log.save()
                    await Client.updateOne({ _id: session.client }, { progress: log.completionPct })
                }
            }
        }
    }

    res.json({ ...session.toObject(), ...summarizeWorkoutSession(session) })
})

// GET /api/workout-sessions?client=&limit=
export const listWorkoutSessions = asyncHandler(async (req, res) => {
    const clientId = await resolveClientId(req)
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const sessions = await WorkoutSession.find({ client: clientId }).sort({ date: -1 }).limit(limit)
    res.json({
        count: sessions.length,
        items: sessions.map((s) => ({ ...s.toObject(), ...summarizeWorkoutSession(s) })),
    })
})

// GET /api/workout-sessions/:sessionId
export const getWorkoutSession = asyncHandler(async (req, res) => {
    const session = await loadSessionOr404(req.params.sessionId)
    assertSessionAccess(req, session)
    res.json({ ...session.toObject(), ...summarizeWorkoutSession(session) })
})

// GET /api/clients/:clientId/workout-adherence?weeks=
export const getWorkoutAdherence = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId === 'me' ? req.client?._id : req.params.clientId
    if (!clientId) throw ApiError.badRequest('Unknown client')
    if (req.user.role === 'client' && String(clientId) !== String(req.client._id)) throw ApiError.forbidden()
    if (req.user.role === 'trainer') {
        const client = await Client.findById(clientId)
        if (!client || String(client.trainer) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Client not assigned to you')
        }
    }

    const weeks = Math.min(Number(req.query.weeks) || 6, 26)
    const result = await computeWorkoutAdherence(clientId, weeks, { ExercisePlan, WorkoutSession })
    res.json(result)
})
