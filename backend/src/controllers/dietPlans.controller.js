import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { DietPlan, DietPlanTemplate, Client } from '../models/index.js'
import { serializeDietPlan } from '../services/dietPlan.service.js'
import { normalizeMeals } from './dietPlanTemplates.controller.js'
import { assertClientAccess } from '../utils/clientAccess.js'

// Turn incoming day payloads (`[{ day, meals }]`) into stored days, running
// each day's meals through the shared normalizeMeals() food-linking logic.
// In 'same' mode, collapse to a single "Everyday" day regardless of what was
// sent — the one place duplication across the 7 weekdays is avoided.
async function normalizeDays(days = [], dayMode = 'same') {
    if (dayMode === 'custom') {
        return Promise.all(
            days.map(async (d) => ({
                day: d.day,
                meals: await normalizeMeals(d.meals || []),
            })),
        )
    }
    return [{ day: 'Everyday', meals: await normalizeMeals(days[0]?.meals || []) }]
}

// Ensure the caller may act on `plan`. Trainers are scoped to their own plans;
// clients to their own; admins unrestricted.
function assertCanAccess(req, plan) {
    if (req.user.role === 'admin') return
    if (req.user.role === 'trainer' && String(plan.trainer) === String(req.trainer?._id)) return
    if (req.user.role === 'client' && String(plan.client) === String(req.client?._id)) return
    throw ApiError.forbidden('You cannot access this diet plan')
}

async function loadPlanOr404(id) {
    const plan = await DietPlan.findById(id)
    if (!plan) throw ApiError.notFound('Diet plan not found')
    return plan
}

// Verify the trainer owns (is assigned to) the target client.
async function assertTrainerOwnsClient(req, clientId) {
    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')
    if (String(client.trainer) !== String(req.trainer._id)) {
        throw ApiError.forbidden('That client is not assigned to you')
    }
    return client
}

// GET /api/diet-plans?client=&status=
export const listDietPlans = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'client') filter.client = req.client._id
    if (req.query.client) filter.client = req.query.client
    if (req.query.status) filter.status = req.query.status

    const plans = await DietPlan.find(filter).sort({ updatedAt: -1 })
    res.json({ count: plans.length, items: plans })
})

// GET /api/diet-plans/:id   -> full plan + computed macros / GL / levels
export const getDietPlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    res.json(await serializeDietPlan(plan))
})

// GET /api/clients/:clientId/diet-plan  -> the client's current published plan
// (the client app's "My Diet" screen).
export const getClientDietPlan = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId === 'me' ? req.client?._id : req.params.clientId
    if (!clientId) throw ApiError.badRequest('Unknown client')

    if (req.user.role === 'client' && String(clientId) !== String(req.client._id)) {
        throw ApiError.forbidden()
    }
    if (req.user.role === 'trainer') await assertTrainerOwnsClient(req, clientId)
    if (req.user.role === 'member') await assertClientAccess(req, clientId)

    const plan = await DietPlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 })
    const fallback = plan ? null : await DietPlan.findOne({ client: clientId }).sort({ updatedAt: -1 })
    const result = plan || fallback
    if (!result) throw ApiError.notFound('No diet plan for this client yet')
    res.json(await serializeDietPlan(result))
})

// POST /api/diet-plans   (trainer)  Body: { clientId, title, days[] }
export const createDietPlan = asyncHandler(async (req, res) => {
    const { clientId, title, days, todayDayId, dayMode } = req.body
    if (!clientId || !title) throw ApiError.badRequest('clientId and title are required')
    await assertTrainerOwnsClient(req, clientId)

    const resolvedDayMode = dayMode === 'custom' ? 'custom' : 'same'
    const plan = await DietPlan.create({
        client: clientId,
        trainer: req.trainer._id,
        title,
        dayMode: resolvedDayMode,
        days: await normalizeDays(days || [], resolvedDayMode),
        todayDayId: todayDayId || null,
        status: 'draft',
    })
    res.status(201).json(await serializeDietPlan(plan))
})

// POST /api/diet-plans/from-template   (trainer)  Body: { clientId, templateId, title? }
// Copies the template's flat meals into a single "Everyday" day on a fresh
// client plan (data/README.md rule: the template is never mutated). The
// trainer can split it into specific weekdays afterward.
export const createFromTemplate = asyncHandler(async (req, res) => {
    const { clientId, templateId, title } = req.body
    if (!clientId || !templateId) throw ApiError.badRequest('clientId and templateId are required')
    await assertTrainerOwnsClient(req, clientId)

    const tpl = await DietPlanTemplate.findById(templateId)
    if (!tpl) throw ApiError.notFound('Template not found')

    const plan = await DietPlan.create({
        client: clientId,
        trainer: req.trainer._id,
        title: title || tpl.name,
        sourceTemplate: tpl._id,
        status: 'draft',
        dayMode: 'same',
        days: [{
            day: 'Everyday',
            meals: tpl.meals.map((m) => ({
                name: m.name,
                time: m.time,
                notes: m.notes,
                taskKey: null,
                options: m.options.map((o) => ({
                    label: o.label,
                    items: o.items.map((it) => ({
                        food: it.food,
                        foodCode: it.foodCode,
                        qty: it.qty,
                    })),
                })),
            })),
        }],
    })
    res.status(201).json(await serializeDietPlan(plan))
})

// PATCH /api/diet-plans/:id   (trainer)  Body: { title?, days?, todayDayId? }
export const updateDietPlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden('Only the trainer can edit a plan')

    if (req.body.title !== undefined) plan.title = req.body.title
    if (req.body.dayMode !== undefined) plan.dayMode = req.body.dayMode === 'custom' ? 'custom' : 'same'
    if (req.body.days !== undefined) plan.days = await normalizeDays(req.body.days, plan.dayMode)
    if (req.body.todayDayId !== undefined) plan.todayDayId = req.body.todayDayId || null
    await plan.save()
    res.json(await serializeDietPlan(plan))
})

// POST /api/diet-plans/:id/publish   (trainer)
export const publishDietPlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden()

    // Only one published plan per client — demote any previous one to 'archived'
    // by simply flipping it back to draft.
    await DietPlan.updateMany(
        { client: plan.client, status: 'published', _id: { $ne: plan._id } },
        { status: 'draft' },
    )
    plan.status = 'published'
    plan.publishedAt = new Date()
    await plan.save()
    res.json(await serializeDietPlan(plan))
})

// PATCH /api/clients/:clientId/diet-plan/select-option   Body: { mealId, optionId }
// The client (or their trainer) chooses which option of a meal to follow.
// A standing per-weekday preference — see DietPlan.js mealSchema comment.
export const selectMealOption = asyncHandler(async (req, res) => {
    const clientId = req.params.clientId === 'me' ? req.client?._id : req.params.clientId
    if (!clientId) throw ApiError.badRequest('Unknown client')
    if (req.user.role === 'client' && String(clientId) !== String(req.client._id)) throw ApiError.forbidden()
    if (req.user.role === 'trainer') await assertTrainerOwnsClient(req, clientId)

    const { mealId, optionId } = req.body
    if (!mealId || !optionId) throw ApiError.badRequest('mealId and optionId are required')

    const plan = await DietPlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 })
    if (!plan) throw ApiError.notFound('No diet plan for this client yet')

    let meal = null
    for (const day of plan.days) {
        meal = day.meals.id(mealId)
        if (meal) break
    }
    if (!meal) throw ApiError.notFound('Meal not found')
    const option = meal.options.id(optionId)
    if (!option) throw ApiError.badRequest('That option does not belong to this meal')

    meal.selectedOptionId = option._id
    await plan.save()
    res.json(await serializeDietPlan(plan))
})

// DELETE /api/diet-plans/:id   (trainer)
export const deleteDietPlan = asyncHandler(async (req, res) => {
    const plan = await loadPlanOr404(req.params.id)
    assertCanAccess(req, plan)
    if (req.user.role !== 'trainer') throw ApiError.forbidden()
    await plan.deleteOne()
    res.json({ ok: true })
})
