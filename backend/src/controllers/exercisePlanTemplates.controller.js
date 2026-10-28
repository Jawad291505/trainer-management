import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ExercisePlanTemplate, Exercise } from '../models/index.js'

// An edited day/exercise arrives with the id it was loaded with; keeping it
// stops a re-save from minting new ids. Editor-local ids are dropped.
const keepId = (doc) => {
    const id = String(doc.id || doc._id || '')
    return /^[a-f\d]{24}$/i.test(id) ? { _id: id } : {}
}

// Turn incoming day payloads into stored days. Each entry is linked to its
// master Exercise by code and takes the library defaults for anything the
// admin didn't set. An entry whose library exercise has since been deleted is
// kept as long as it still carries its own name. A name sent with the entry
// (the admin may rename it) wins over the library name.
async function normalizeDays(days = []) {
    if (!Array.isArray(days)) throw ApiError.badRequest('days must be a list')

    const codes = [...new Set(days.flatMap((d) => (d.exercises || []).map((e) => e.exerciseCode).filter(Boolean)))]
    const lib = codes.length ? await Exercise.find({ code: { $in: codes }, isMaster: true }) : []
    const byCode = new Map(lib.map((x) => [x.code, x]))

    return days.map((d) => {
        if (!String(d.day || '').trim()) throw ApiError.badRequest('Each training day needs a day')
        return {
            ...keepId(d),
            day: d.day,
            focus: d.focus || '',
            note: d.note || '',
            exercises: (d.exercises || []).map((e) => {
                const ref = e.exerciseCode ? byCode.get(e.exerciseCode) : null
                if (!ref && !e.name) throw ApiError.badRequest(`Unknown exercise code: ${e.exerciseCode}`)
                return {
                    ...keepId(e),
                    exercise: ref?._id || null,
                    exerciseCode: ref?.code || e.exerciseCode || null,
                    name: String(e.name || '').trim() || ref?.name,
                    category: ref?.category || e.category || '',
                    sets: e.sets ?? ref?.defaultSets ?? 3,
                    reps: e.reps ?? ref?.defaultReps ?? '8-12',
                    rest: e.rest ?? ref?.defaultRest ?? '60s',
                    technique: e.technique ?? ref?.technique ?? 'standard',
                    youtube: e.youtube ?? ref?.youtube ?? '',
                    instructions: e.instructions ?? ref?.notes ?? '',
                    trackingType: e.trackingType ?? ref?.trackingType ?? 'reps',
                    targetWeight: e.targetWeight ?? ref?.defaultWeight ?? null,
                    targetDuration: e.targetDuration ?? ref?.defaultDuration ?? null,
                    important: !!e.important,
                }
            }),
        }
    })
}

// GET /api/exercise-plan-templates
export const listTemplates = asyncHandler(async (_req, res) => {
    const items = await ExercisePlanTemplate.find({}).sort({ createdAt: 1 })
    res.json({ items })
})

// GET /api/exercise-plan-templates/:id
export const getTemplate = asyncHandler(async (req, res) => {
    const t = await ExercisePlanTemplate.findById(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')
    res.json(t)
})

// POST /api/exercise-plan-templates   (admin)
export const createTemplate = asyncHandler(async (req, res) => {
    const { name, goal, description, days } = req.body
    if (!name) throw ApiError.badRequest('name is required')

    const t = await ExercisePlanTemplate.create({
        name,
        goal,
        description,
        days: await normalizeDays(days),
    })
    res.status(201).json(t)
})

// PATCH /api/exercise-plan-templates/:id   (admin)
export const updateTemplate = asyncHandler(async (req, res) => {
    const t = await ExercisePlanTemplate.findById(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')

    if (req.body.name !== undefined) t.name = req.body.name
    if (req.body.goal !== undefined) t.goal = req.body.goal
    if (req.body.description !== undefined) t.description = req.body.description
    if (req.body.days !== undefined) t.days = await normalizeDays(req.body.days)

    await t.save()
    res.json(t)
})

// DELETE /api/exercise-plan-templates/:id   (admin)
export const deleteTemplate = asyncHandler(async (req, res) => {
    const t = await ExercisePlanTemplate.findByIdAndDelete(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')
    res.json({ ok: true })
})
