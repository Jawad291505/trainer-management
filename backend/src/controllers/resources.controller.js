import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { LibraryResource } from '../models/index.js'

// GET /api/resources?category=&status=&search=
// Admin manages; trainers/clients read (active only).
export const listResources = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category
    if (req.query.status) filter.status = req.query.status
    else if (req.user.role !== 'admin') filter.status = 'active'
    if (req.query.search) filter.title = { $regex: String(req.query.search).trim(), $options: 'i' }

    const items = await LibraryResource.find(filter).sort({ updatedAt: -1 })
    res.json({ count: items.length, items })
})

// POST /api/resources   (admin)
export const createResource = asyncHandler(async (req, res) => {
    const { title, category, url } = req.body
    if (!title || !category || !url) throw ApiError.badRequest('title, category and url are required')
    const item = await LibraryResource.create({
        title,
        category,
        url,
        description: req.body.description || '',
        status: req.body.status || 'active',
    })
    res.status(201).json(item)
})

// PATCH /api/resources/:id   (admin)
export const updateResource = asyncHandler(async (req, res) => {
    const item = await LibraryResource.findById(req.params.id)
    if (!item) throw ApiError.notFound('Resource not found')
    for (const k of ['title', 'category', 'url', 'description', 'status']) {
        if (req.body[k] !== undefined) item[k] = req.body[k]
    }
    await item.save()
    res.json(item)
})

// DELETE /api/resources/:id   (admin)
export const deleteResource = asyncHandler(async (req, res) => {
    const item = await LibraryResource.findByIdAndDelete(req.params.id)
    if (!item) throw ApiError.notFound('Resource not found')
    res.json({ ok: true })
})
