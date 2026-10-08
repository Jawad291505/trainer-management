import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { DietPlanTemplate, Food } from '../models/index.js'
import { MAX_DIET_PLAN_TEMPLATES } from '../config/constants.js'
import { resolvePlanNutrition } from '../services/dietPlan.service.js'
import { sortMealsByTime } from '../utils/mealTime.js'

// A meal payload may arrive as `{ options: [{label, items}] }` (current shape)
// or, from older callers, a flat `{ items }` — normalise to always be options.
function mealOptionsInput(m) {
    if (Array.isArray(m.options)) return m.options
    return [{ label: 'Option 1', items: m.items || [] }]
}

const httpUrlOrNull = (value) => {
    try {
        const u = new URL(String(value || '').trim())
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
    } catch {
        return null
    }
}

// A meal's supplements — kept apart from its food items (see DietPlan.js
// supplementSchema). Nameless rows are dropped; links must be http(s), and the
// stored preview only survives alongside a valid link.
function normalizeSupplements(supplements) {
    if (!Array.isArray(supplements)) return []
    return supplements
        .filter((s) => s && String(s.name || '').trim())
        .map((s) => {
            const rawUrl = String(s.url || '').trim()
            const url = rawUrl ? httpUrlOrNull(rawUrl) : ''
            if (url === null) throw ApiError.badRequest(`Invalid link for supplement "${String(s.name).trim()}"`)
            const p = url && s.preview ? s.preview : null
            return {
                name: String(s.name).trim().slice(0, 120),
                dosage: String(s.dosage || '').trim().slice(0, 120),
                url,
                preview: p
                    ? {
                        title: String(p.title || '').slice(0, 200),
                        description: String(p.description || '').slice(0, 300),
                        image: p.image ? httpUrlOrNull(p.image) : null,
                        siteName: String(p.siteName || '').slice(0, 80),
                    }
                    : null,
            }
        })
}

// An edited meal/option arrives with the id it was loaded with; keeping it
// stops a re-save from minting new ids. Builder-local ids ("M3") are dropped.
const keepId = (doc) => {
    const id = String(doc.id || doc._id || '')
    return /^[a-f\d]{24}$/i.test(id) ? { _id: id } : {}
}

// Turn incoming meal payloads into stored meals, linking each option item's
// foodCode to a Food _id. Shared by templates and client diet plans.
export async function normalizeMeals(meals = []) {
    const codes = [
        ...new Set(
            meals.flatMap((m) => mealOptionsInput(m).flatMap((o) => (o.items || []).map((it) => it.foodCode))),
        ),
    ]
    const foods = await Food.find({ code: { $in: codes } })
    const byCode = new Map(foods.map((f) => [f.code, f]))

    const resolveItems = (items = []) =>
        items.map((it) => {
            const food = byCode.get(it.foodCode)
            if (!food) throw ApiError.badRequest(`Unknown food code: ${it.foodCode}`)
            return {
                food: food._id,
                foodCode: food.code,
                food_name: food.name,
                qty: Number(it.qty) || 0,
                unit: food.unit,
            }
        })

    // Stored chronologically, whatever order the meals were created/sent in.
    return sortMealsByTime(meals).map((m) => ({
        ...keepId(m),
        name: m.name,
        time: m.time || '',
        notes: m.notes || '',
        taskKey: m.taskKey ?? null,
        supplements: normalizeSupplements(m.supplements),
        options: mealOptionsInput(m).map((o) => ({
            ...keepId(o),
            label: o.label || 'Option 1',
            items: resolveItems(o.items),
        })),
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
