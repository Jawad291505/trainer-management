import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { NutritionConfig } from '../models/index.js'
import { invalidateThresholds } from '../services/libraryCache.js'
import { computeNutrition, computeGL, giLevel, glItemLevel, glMealLevel } from '../services/nutrition.service.js'

// GET /api/nutrition/config
export const getConfig = asyncHandler(async (_req, res) => {
    const cfg = await NutritionConfig.getDefault()
    res.json({ gi: cfg.gi, glItem: cfg.glItem, glMeal: cfg.glMeal })
})

// PUT /api/nutrition/config   (admin) Body: { gi:{medium,high}, glItem:{...}, glMeal:{...} }
export const updateConfig = asyncHandler(async (req, res) => {
    const cfg = await NutritionConfig.getDefault()
    for (const band of ['gi', 'glItem', 'glMeal']) {
        if (req.body[band]) {
            if (req.body[band].medium != null) cfg[band].medium = req.body[band].medium
            if (req.body[band].high != null) cfg[band].high = req.body[band].high
        }
    }
    await cfg.save()
    invalidateThresholds()
    res.json({ gi: cfg.gi, glItem: cfg.glItem, glMeal: cfg.glMeal })
})

// POST /api/nutrition/compute
// Body: { base, qty, cal, protein, carbs, fat, gi }  (arbitrary / custom food)
// Mirrors the "Add something else" custom path in trainer FoodModal.jsx.
export const compute = asyncHandler(async (req, res) => {
    const { base, qty, cal = 0, protein = 0, carbs = 0, fat = 0, gi = 0 } = req.body || {}
    if (base == null || qty == null) throw ApiError.badRequest('base and qty are required')

    const cfg = await NutritionConfig.getDefault()
    const n = computeNutrition({ base, cal, protein, carbs, fat, gi }, qty)
    res.json({
        ...n,
        giLevel: giLevel(n.gi, cfg),
        glLevel: glItemLevel(n.gl, cfg),
    })
})

// POST /api/nutrition/meal-gl   Body: { items: [{ gi, carbs }] }  -> summed meal GL + level
export const mealGl = asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : []
    const cfg = await NutritionConfig.getDefault()
    const perItem = items.map((it) => computeGL(it.gi || 0, it.carbs || 0))
    const total = Math.round(perItem.reduce((s, v) => s + v, 0) * 10) / 10
    res.json({ perItem, total, level: glMealLevel(total, cfg) })
})
