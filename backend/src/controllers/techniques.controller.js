import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Technique } from '../models/index.js'
import { TECHNIQUE_LIMITS } from '../config/constants.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'
import { normalizeYouTubeUrl } from '../utils/youtube.js'

// Techniques Library. Ownership mirrors the exercise library:
//   admin / member -> manage the shared (master) techniques every trainer can use
//   trainer        -> reads shared + their own; creates / edits / deletes only their own
// Clients have no access here — they see the copies attached to their plan.

const isTrainer = (req) => req.user.role === 'trainer'

// What the caller may see.
function visibleFilter(req) {
    if (!isTrainer(req)) return { isMaster: true }
    return { $or: [{ isMaster: true }, { isMaster: { $ne: true }, owner: req.trainer._id }] }
}

// What the caller may edit / delete.
function canManage(req, technique) {
    if (isTrainer(req)) return !technique.isMaster && String(technique.owner) === String(req.trainer._id)
    return technique.isMaster
}

const present = (req, technique) => ({ ...technique.toJSON(), editable: canManage(req, technique) })

async function findVisibleOr404(req, id) {
    const technique = mongoose.isValidObjectId(id)
        ? await Technique.findOne({ $and: [{ _id: id }, visibleFilter(req)] })
        : null
    if (!technique) throw ApiError.notFound('Technique not found')
    return technique
}

// Validates the technique fields (title + instructions required, youtube optional). With `partial`, only fields present in
// the body are checked (PATCH). Returns the cleaned values.
function readFields(body = {}, { partial = false } = {}) {
    const out = {}
    const errors = {}

    for (const key of ['title', 'instructions']) {
        if (partial && body[key] === undefined) continue
        const value = String(body[key] ?? '').trim()
        if (!value) errors[key] = `${key === 'title' ? 'Title' : 'Instructions'} is required`
        else if (value.length > TECHNIQUE_LIMITS[key]) errors[key] = `Must be ${TECHNIQUE_LIMITS[key]} characters or fewer`
        else out[key] = value
    }

    if (!partial || body.youtube !== undefined) {
        // Optional — a blank value means "no video" (and clears one on edit).
        const raw = String(body.youtube ?? '').trim()
        const url = raw ? normalizeYouTubeUrl(raw) : ''
        if (url === null || url.length > TECHNIQUE_LIMITS.youtube) errors.youtube = 'Enter a valid YouTube video link'
        else out.youtube = url
    }

    if (Object.keys(errors).length) throw ApiError.badRequest(Object.values(errors)[0], errors)
    return out
}

// One library can't hold two techniques with the same title (case-insensitive):
// the shared library is one scope, each trainer's own list another.
async function assertTitleFree(scope, title, exceptId) {
    const clash = await Technique.findOne({
        ...scope,
        title: new RegExp(`^${escapeRegex(title)}$`, 'i'),
        ...(exceptId ? { _id: { $ne: exceptId } } : {}),
    }).select('_id')
    if (clash) throw ApiError.conflict('A technique with this title already exists', { title: 'A technique with this title already exists' })
}

const ownScope = (req) => (isTrainer(req) ? { isMaster: { $ne: true }, owner: req.trainer._id } : { isMaster: true })

// GET /api/techniques?search=&scope=shared|mine&page=&limit=   (pagination is opt-in — see utils/pagination.js)
export const listLibraryTechniques = asyncHandler(async (req, res) => {
    const and = [visibleFilter(req)]
    if (req.query.scope === 'shared') and.push({ isMaster: true })
    else if (req.query.scope === 'mine') and.push({ isMaster: { $ne: true } })

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        and.push({ $or: [{ title: rx }, { instructions: rx }] })
    }

    const filter = { $and: and }
    const query = Technique.find(filter).collation({ locale: 'en', strength: 2 }).sort({ title: 1 })
    const paging = pageParams(req.query)
    if (!paging) {
        const items = (await query).map((t) => present(req, t))
        return res.json({ count: items.length, items })
    }
    const [docs, total] = await Promise.all([
        query.skip(paging.skip).limit(paging.limit),
        Technique.countDocuments(filter),
    ])
    res.json(pagedBody(docs.map((t) => present(req, t)), total, paging))
})

// GET /api/techniques/:id
export const getLibraryTechnique = asyncHandler(async (req, res) => {
    res.json(present(req, await findVisibleOr404(req, req.params.id)))
})

// POST /api/techniques   Body: { title, instructions, youtube }
export const createTechnique = asyncHandler(async (req, res) => {
    const fields = readFields(req.body)
    await assertTitleFree(ownScope(req), fields.title)

    const trainer = isTrainer(req)
    const technique = await Technique.create({
        ...fields,
        source: trainer ? 'trainer' : 'admin',
        isMaster: !trainer,
        owner: trainer ? req.trainer._id : null,
        createdBy: req.user._id,
    })
    res.status(201).json(present(req, technique))
})

// PATCH /api/techniques/:id   Body: { title?, instructions?, youtube? }
// Plans that already use the technique keep the copy they were given.
export const updateTechnique = asyncHandler(async (req, res) => {
    const technique = await findVisibleOr404(req, req.params.id)
    if (!canManage(req, technique)) {
        throw ApiError.forbidden(isTrainer(req) ? 'Trainers can only edit their own techniques' : 'You cannot edit this technique')
    }
    const fields = readFields(req.body, { partial: true })
    if (fields.title) await assertTitleFree(ownScope(req), fields.title, technique._id)
    Object.assign(technique, fields)
    await technique.save()
    res.json(present(req, technique))
})

// DELETE /api/techniques/:id
// Only the library row goes; plans that already use it keep their copy.
export const deleteTechnique = asyncHandler(async (req, res) => {
    const technique = await findVisibleOr404(req, req.params.id)
    if (!canManage(req, technique)) {
        throw ApiError.forbidden(isTrainer(req) ? 'Trainers can only delete their own techniques' : 'You cannot delete this technique')
    }
    await technique.deleteOne()
    res.json({ ok: true })
})
