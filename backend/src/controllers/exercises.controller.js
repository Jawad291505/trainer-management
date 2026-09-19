import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Exercise, ExerciseTechnique, LibraryCategory } from '../models/index.js'
import { exerciseCode as makeCode } from '../utils/slugify.js'
import { masterExercises } from '../services/libraryCache.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

// Master exercises are served from memory (see services/libraryCache.js); only a
// trainer's own custom exercises are read from the database per request.

async function findExerciseOr404(idOrCode) {
    const query = mongoose.isValidObjectId(idOrCode) ? { _id: idOrCode } : { code: idOrCode }
    const ex = await Exercise.findOne(query)
    if (!ex) throw ApiError.notFound('Exercise not found')
    return ex
}

// GET /api/exercises?category=&search=&technique=&source=&page=&limit=   (pagination is opt-in — see utils/pagination.js)
export const listExercises = asyncHandler(async (req, res) => {
    const isTrainer = req.user?.role === 'trainer' && req.trainer
    const [master, own] = await Promise.all([
        masterExercises.get(),
        isTrainer ? Exercise.find({ isMaster: { $ne: true }, owner: req.trainer._id }).sort({ name: 1 }) : [],
    ])

    const { category, technique, source, search } = req.query
    const needle = search ? String(search).trim().toLowerCase() : ''
    const items = [...master, ...own.map((d) => d.toJSON())].filter((x) =>
        (!category || category === 'all' || x.category === category) &&
        (!technique || x.technique === technique) &&
        (!source || x.source === source) &&
        (!needle || x.name.toLowerCase().includes(needle)),
    )
    const paging = pageParams(req.query)
    if (!paging) return res.json({ count: items.length, items })
    res.json(pagedBody(items.slice(paging.skip, paging.skip + paging.limit), items.length, paging))
})

// GET /api/exercises/categories
export const listExerciseCategories = asyncHandler(async (_req, res) => {
    const cats = await LibraryCategory.find({ kind: 'exercise' }).sort({ order: 1, name: 1 })
    res.json({ categories: cats.map((c) => c.name), items: cats })
})

// GET /api/exercises/techniques  (data/exerciseTechniques.json)
export const listTechniques = asyncHandler(async (_req, res) => {
    const items = await ExerciseTechnique.find({}).sort({ order: 1 })
    res.json({ items })
})

// GET /api/exercises/:id
export const getExercise = asyncHandler(async (req, res) => {
    res.json(await findExerciseOr404(req.params.id))
})

// POST /api/exercises
export const createExercise = asyncHandler(async (req, res) => {
    const body = req.body || {}
    if (!body.name || !body.category) throw ApiError.badRequest('name and category are required')

    const isTrainer = req.user.role === 'trainer'
    let code = body.code || makeCode(body.name)
    if (isTrainer) code = `${code}-t${Date.now().toString(36)}`

    const ex = await Exercise.create({
        code,
        name: body.name,
        category: body.category,
        technique: body.technique || 'standard',
        defaultSets: body.defaultSets ?? 3,
        defaultReps: body.defaultReps ?? '8-12',
        defaultRest: body.defaultRest ?? '60s',
        youtube: body.youtube || '',
        notes: body.notes || '',
        equipment: body.equipment || '',
        target: body.target || '',
        source: isTrainer ? 'trainer' : 'admin',
        isMaster: !isTrainer,
        owner: isTrainer ? req.trainer._id : null,
    })
    if (ex.isMaster) masterExercises.invalidate()
    res.status(201).json(ex)
})

// PATCH /api/exercises/:id
export const updateExercise = asyncHandler(async (req, res) => {
    const ex = await findExerciseOr404(req.params.id)
    if (req.user.role === 'trainer') {
        if (ex.isMaster || String(ex.owner) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Trainers can only edit their own custom exercises')
        }
    }
    const editable = [
        'name', 'category', 'technique', 'defaultSets', 'defaultReps', 'defaultRest',
        'youtube', 'notes', 'equipment', 'target',
    ]
    for (const key of editable) if (req.body[key] !== undefined) ex[key] = req.body[key]
    await ex.save()
    if (ex.isMaster) masterExercises.invalidate()
    res.json(ex)
})

// DELETE /api/exercises/:id
export const deleteExercise = asyncHandler(async (req, res) => {
    const ex = await findExerciseOr404(req.params.id)
    if (req.user.role === 'trainer') {
        if (ex.isMaster || String(ex.owner) !== String(req.trainer._id)) {
            throw ApiError.forbidden('Trainers can only delete their own custom exercises')
        }
    }
    await ex.deleteOne()
    if (ex.isMaster) masterExercises.invalidate()
    res.json({ ok: true })
})
