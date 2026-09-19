import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Food, LibraryCategory, NutritionConfig } from '../models/index.js'
import { foodCode as makeCode } from '../utils/slugify.js'
import { computeNutrition, giLevel, glItemLevel } from '../services/nutrition.service.js'
import { masterFoods } from '../services/libraryCache.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

// Master foods are served from memory (see services/libraryCache.js).

async function findFoodOr404(idOrCode) {
    const query = mongoose.isValidObjectId(idOrCode) ? { _id: idOrCode } : { code: idOrCode }
    const food = await Food.findOne(query)
    if (!food) throw ApiError.notFound('Food not found')
    return food
}

// GET /api/foods?category=&search=&source=&page=&limit=   (pagination is opt-in — see utils/pagination.js)
export const listFoods = asyncHandler(async (req, res) => {
    // Visibility (matches trainer/src/context/LibraryContext.jsx `foods` = [...master, ...ownCustom]):
    //   - admin & client: master library only
    //   - trainer: master library + their own custom foods
    const isTrainer = req.user?.role === 'trainer' && req.trainer
    const [master, own] = await Promise.all([
        masterFoods.get(),
        isTrainer ? Food.find({ isMaster: { $ne: true }, owner: req.trainer._id }).sort({ name: 1 }) : [],
    ])

    const { category, source, search } = req.query
    const needle = search ? String(search).trim().toLowerCase() : ''
    const items = [...master, ...own.map((d) => d.toJSON())].filter((x) =>
        (!category || category === 'all' || x.category === category) &&
        (!source || x.source === source) &&
        (!needle || x.name.toLowerCase().includes(needle)),
    )
    const paging = pageParams(req.query)
    if (!paging) return res.json({ count: items.length, items })
    res.json(pagedBody(items.slice(paging.skip, paging.skip + paging.limit), items.length, paging))
})

// GET /api/foods/categories
export const listFoodCategories = asyncHandler(async (_req, res) => {
    const cats = await LibraryCategory.find({ kind: 'food' }).sort({ order: 1, name: 1 })
    res.json({ categories: cats.map((c) => c.name), items: cats })
})

// GET /api/foods/thresholds  — GI/GL config the client-side calculator needs
export const getThresholds = asyncHandler(async (_req, res) => {
    const cfg = await NutritionConfig.getDefault()
    res.json({ gi: cfg.gi, glItem: cfg.glItem, glMeal: cfg.glMeal })
})

// GET /api/foods/:id  (id or code)
export const getFood = asyncHandler(async (req, res) => {
    res.json(await findFoodOr404(req.params.id))
})

// POST /api/foods
export const createFood = asyncHandler(async (req, res) => {
    const body = req.body || {}
    if (!body.name || body.base == null || !body.category) {
        throw ApiError.badRequest('name, category and base are required')
    }

    const isTrainer = req.user.role === 'trainer'
    const doc = {
        code: body.code || makeCode(body.name),
        name: body.name,
        category: body.category,
        unit: body.unit || 'g',
        base: body.base,
        step: body.step ?? (body.unit === 'count' ? 1 : 10),
        defaultQty: body.defaultQty ?? body.base,
        serving: body.serving || '',
        gi: body.gi || 0,
        gl: body.gl || 0,
        cal: body.cal || 0,
        protein: body.protein || 0,
        carbs: body.carbs || 0,
        fat: body.fat || 0,
        fiber: body.fiber || 0,
        source: isTrainer ? 'trainer' : 'admin',
        isMaster: !isTrainer,
        owner: isTrainer ? req.trainer._id : null,
    }
    // Keep trainer-custom codes unique per owner without colliding with master.
    if (isTrainer) doc.code = `${doc.code}-t${Date.now().toString(36)}`

    const food = await Food.create(doc)
    if (food.isMaster) masterFoods.invalidate()
    res.status(201).json(food)
})

// PATCH /api/foods/:id
export const updateFood = asyncHandler(async (req, res) => {
    const food = await findFoodOr404(req.params.id)

    if (req.user.role === 'trainer') {
        if (food.isMaster || String(food.owner) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Trainers can only edit their own custom foods')
        }
    }

    const editable = [
        'name', 'category', 'unit', 'base', 'step', 'defaultQty', 'serving',
        'gi', 'gl', 'cal', 'protein', 'carbs', 'fat', 'fiber',
    ]
    for (const key of editable) if (req.body[key] !== undefined) food[key] = req.body[key]
    await food.save()
    if (food.isMaster) masterFoods.invalidate()
    res.json(food)
})

// DELETE /api/foods/:id
export const deleteFood = asyncHandler(async (req, res) => {
    const food = await findFoodOr404(req.params.id)
    if (req.user.role === 'trainer') {
        if (food.isMaster || String(food.owner) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Trainers can only delete their own custom foods')
        }
    }
    await food.deleteOne()
    if (food.isMaster) masterFoods.invalidate()
    res.json({ ok: true })
})

// POST /api/foods/:id/compute   Body: { qty }
// Server-side computeNutrition — same maths the front-end FoodModal shows live.
export const computeFood = asyncHandler(async (req, res) => {
    const food = await findFoodOr404(req.params.id)
    const qty = Number(req.body?.qty ?? food.defaultQty)
    const cfg = await NutritionConfig.getDefault()
    const n = computeNutrition(food, qty)
    res.json({
        food: { id: String(food._id), code: food.code, name: food.name, unit: food.unit, base: food.base },
        qty,
        ...n,
        giLevel: giLevel(n.gi, cfg),
        glLevel: glItemLevel(n.gl, cfg),
    })
})
