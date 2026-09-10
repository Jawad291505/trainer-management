import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { DietPlanTemplate, Food } from '../models/index.js'
import { MAX_DIET_PLAN_TEMPLATES } from '../config/constants.js'
import { resolvePlanNutrition } from '../services/dietPlan.service.js'

// Turn incoming meal payloads into stored meals, linking each item's foodCode to
// a Food _id. Shared by templates and client diet plans.
export async function normalizeMeals(meals = []) {
    const codes = [...new Set(meals.flatMap((m) => (m.items || []).map((it) => it.foodCode)))]
    const foods = await Food.find({ code: { $in: codes } })
    const byCode = new Map(foods.map((f) => [f.code, f]))

    return meals.map((m) => ({
        name: m.name,
        time: m.time || '',
        notes: m.notes || '',
        taskKey: m.taskKey ?? null,
        items: (m.items || []).map((it) => {
            const food = byCode.get(it.foodCode)
            if (!food) throw ApiError.badRequest(`Unknown food code: ${it.foodCode}`)
            return {
                food: food._id,
                foodCode: food.code,
                food_name: food.name,
                qty: Number(it.qty) || 0,
                unit: food.unit,
            }
        }),
    }))
}

// GET /api/diet-plan-templates?withNutrition=1
export const listTemplates = asyncHandler(async (req, res) => {
    const templates = await DietPlanTemplate.find({}).sort({ createdAt: 1 })
    if (!req.query.withNutrition) return res.json({ items: templates, max: MAX_DIET_PLAN_TEMPLATES })

    const items = await Promise.all(
        templates.map(async (t) => ({ ...t.toObject(), ...(await resolvePlanNutrition(t)) })),
    )
    res.json({ items, max: MAX_DIET_PLAN_TEMPLATES })
})

// GET /api/diet-plan-templates/:id
export const getTemplate = asyncHandler(async (req, res) => {
    const t = await DietPlanTemplate.findById(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')
    res.json({ ...t.toObject(), ...(await resolvePlanNutrition(t)) })
})

// POST /api/diet-plan-templates   (admin)
export const createTemplate = asyncHandler(async (req, res) => {
    const count = await DietPlanTemplate.countDocuments()
    if (count >= MAX_DIET_PLAN_TEMPLATES) {
        throw ApiError.badRequest(`Only ${MAX_DIET_PLAN_TEMPLATES} diet-plan templates are allowed`)
    }
    const { name, goal, description, meals } = req.body
    if (!name) throw ApiError.badRequest('name is required')

    const t = await DietPlanTemplate.create({
        name,
        goal,
        description,
        code: req.body.code,
        meals: await normalizeMeals(meals),
    })
    res.status(201).json(t)
})

// PATCH /api/diet-plan-templates/:id   (admin)
export const updateTemplate = asyncHandler(async (req, res) => {
    const t = await DietPlanTemplate.findById(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')

    if (req.body.name !== undefined) t.name = req.body.name
    if (req.body.goal !== undefined) t.goal = req.body.goal
    if (req.body.description !== undefined) t.description = req.body.description
    if (req.body.meals !== undefined) t.meals = await normalizeMeals(req.body.meals)

    await t.save()
    res.json(t)
})

// DELETE /api/diet-plan-templates/:id   (admin)
export const deleteTemplate = asyncHandler(async (req, res) => {
    const t = await DietPlanTemplate.findByIdAndDelete(req.params.id)
    if (!t) throw ApiError.notFound('Template not found')
    res.json({ ok: true })
})
