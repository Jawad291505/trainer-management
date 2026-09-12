import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ExercisePlan, Exercise, Client, DailyLog } from '../models/index.js'
import { summarizeExercisePlan } from '../services/exercisePlan.service.js'

function assertCanAccess(req, plan) {
    if (req.user.role === 'admin') return
    if (req.user.role === 'trainer' && String(plan.trainer) === String(req.trainer?._id)) return
    if (req.user.role === 'client' && String(plan.client) === String(req.client?._id)) return
    throw ApiError.forbidden('You cannot access this exercise plan')
}

async function loadPlanOr404(id) {
    const plan = await ExercisePlan.findById(id)
    if (!plan) throw ApiError.notFound('Exercise plan not found')
    return plan
}

async function assertTrainerOwnsClient(req, clientId) {
    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')
    if (String(client.trainer) !== String(req.trainer._id)) {
        throw ApiError.forbidden('That client is not assigned to you')
    }
}

// Resolve each incoming exercise entry, pulling library defaults when only a
// code/id is supplied (mirrors trainer ExerciseModal prefill behaviour).
async function normalizeDays(days = []) {
    const codes = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.exerciseCode).filter(Boolean)))]
    const lib = codes.length ? await Exercise.find({ code: { $in: codes } }) : []
    const byCode = new Map(lib.map((x) => [x.code, x]))

    return days.map((d) => ({
        day: d.day,
        focus: d.focus || '',
        note: d.note || '',
        exercises: (d.exercises || []).map((e) => {
            const ref = e.exerciseCode ? byCode.get(e.exerciseCode) : null
            return {
                exercise: ref?._id || null,
                exerciseCode: ref?.code || e.exerciseCode || null,
                name: e.name || ref?.name,
                sets: e.sets ?? ref?.defaultSets ?? 3,
                reps: e.reps ?? ref?.defaultReps ?? '8-12',
                rest: e.rest ?? ref?.defaultRest ?? '60s',
                technique: e.technique ?? ref?.technique ?? 'standard',
                youtube: e.youtube ?? ref?.youtube ?? '',
                instructions: e.instructions ?? ref?.notes ?? '',
                trackingType: e.trackingType ?? ref?.trackingType ?? 'reps',
                targetWeight: e.targetWeight ?? ref?.defaultWeight ?? null,
                targetDuration: e.targetDuration ?? ref?.defaultDuration ?? null,
                done: !!e.done,
            }
        }),
    }))
}

// GET /api/exercise-plans?client=&status=
export const listExercisePlans = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'client') filter.client = req.client._id
    if (req.query.client) filter.client = req.query.client
    if (req.query.status) filter.status = req.query.status

    const plans = await ExercisePlan.find(filter).sort({ updatedAt: -1 })
    res.json({ count: plans.length, items: plans })
})

// GET /api/exercise-plans/:id  -> plan + per-day + overall completion %
export const getExercisePlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    res.json({ ...plan.toObject(), ...summarizeExercisePlan(plan) })
})

// GET /api/clients/:clientId/exercise-plan  -> current published plan
export const getClientExercisePlan = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId === 'me' ? req.client?._id : req.params.clientId
    if (!clientId) throw ApiError.badRequest('Unknown client')
    if (req.user.role === 'client' && String(clientId) !== String(req.client._id)) throw ApiError.forbidden()
    if (req.user.role === 'trainer') await assertTrainerOwnsClient(req, clientId)

    const plan = await ExercisePlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 })
    const fallback = plan ? null : await ExercisePlan.findOne({ client: clientId }).sort({ updatedAt: -1 })
    const result = plan || fallback
    if (!result) throw ApiError.notFound('No exercise plan for this client yet')
    res.json({ ...result.toObject(), ...summarizeExercisePlan(result) })
})

// POST /api/exercise-plans  (trainer)  Body: { clientId, title, days[], todayDayId? }
export const createExercisePlan = asyncHandler(async (req, res) => {
    const { clientId, title, days } = req.body
    if (!clientId || !title) throw ApiError.badRequest('clientId and title are required')
    await assertTrainerOwnsClient(req, clientId)

    const plan = await ExercisePlan.create({
        client: clientId,
        trainer: req.trainer._id,
        title,
        status: 'draft',
        days: await normalizeDays(days || []),
    })
    res.status(201).json({ ...plan.toObject(), ...summarizeExercisePlan(plan) })
})

// PATCH /api/exercise-plans/:id  (trainer)  Body: { title?, days?, todayDayId? }
export const updateExercisePlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden('Only the trainer can edit a plan')

    if (req.body.title !== undefined) plan.title = req.body.title
    if (req.body.days !== undefined) plan.days = await normalizeDays(req.body.days)
    if (req.body.todayDayId !== undefined) plan.todayDayId = req.body.todayDayId
    await plan.save()
    res.json({ ...plan.toObject(), ...summarizeExercisePlan(plan) })
})

// PATCH /api/exercise-plans/:id/exercises/:exId  -> toggle `done` (client or trainer)
export const setExerciseDone = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)

    let found = false
    let matchedDay = null
    for (const day of plan.days) {
        const ex = day.exercises.id(req.params.exId)
        if (ex) {
            ex.done = req.body.done ?? !ex.done
            found = true
            matchedDay = day
            break
        }
    }
    if (!found) throw ApiError.notFound('Exercise not found in plan')
    await plan.save()

    // Sync daily log workout task when all exercises in the day are completed
    if (matchedDay && req.user.role === 'client') {
        const allDone = matchedDay.exercises.every((e) => e.done)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const log = await DailyLog.findOne({ client: plan.client, date: today })
        if (log) {
            const workoutTask = log.tasks.find((t) => t.key === `workout:${matchedDay._id}`)
            if (workoutTask && workoutTask.done !== allDone) {
                workoutTask.done = allDone
                await log.save()
                await Client.updateOne({ _id: plan.client }, { progress: log.completionPct })
            }
        }
    }

    res.json({ ...plan.toObject(), ...summarizeExercisePlan(plan) })
})

// POST /api/exercise-plans/:id/publish  (trainer)
export const publishExercisePlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden()

    await ExercisePlan.updateMany(
        { client: plan.client, status: 'published', _id: { $ne: plan._id } },
        { status: 'draft' },
    )
    plan.status = 'published'
    plan.publishedAt = new Date()
    await plan.save()
    res.json({ ...plan.toObject(), ...summarizeExercisePlan(plan) })
})

// DELETE /api/exercise-plans/:id  (trainer)
export const deleteExercisePlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden()
    await plan.deleteOne()
    res.json({ ok: true })
})
