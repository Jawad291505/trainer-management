import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ProgressPhoto, Client } from '../models/index.js'

async function assertTrainerOwnsClient(req, clientId) {
    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')
    if (String(client.trainer) !== String(req.trainer._id)) throw ApiError.forbidden('Client not assigned to you')
    return client
}

// GET /api/progress-photos?client=   (client: own; trainer: their client's)
export const listPhotos = asyncHandler(async (req, res) => {
    let clientId
    if (req.user.role === 'client') clientId = req.client._id
    else {
        clientId = req.query.client
        if (!clientId) throw ApiError.badRequest('client query param required')
        await assertTrainerOwnsClient(req, clientId)
    }

    const photos = await ProgressPhoto.find({ client: clientId }).sort({ date: -1, createdAt: -1 })

    // Group by date (newest first) like trainer ProgressPhotosContext.photosForClient.
    const groups = new Map()
    for (const p of photos) {
        const key = p.date.toISOString().slice(0, 10)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(p)
    }
    res.json({
        count: photos.length,
        pendingReview: photos.filter((p) => !p.note).length,
        groups: [...groups.entries()].map(([date, items]) => ({ date, items })),
        items: photos,
    })
})

// POST /api/progress-photos   (client)  Body: { image (data URL), angle, caption, date }
export const uploadPhoto = asyncHandler(async (req, res) => {
    const { image, angle, caption, date } = req.body
    if (!image) throw ApiError.badRequest('image (data URL) is required')

    const client = await Client.findById(req.client._id)
    const photo = await ProgressPhoto.create({
        client: client._id,
        trainer: client.trainer || null,
        date: date ? new Date(date) : new Date(),
        image,
        angle: angle || 'front',
        caption: caption || '',
    })
    res.status(201).json(photo)
})

// PATCH /api/progress-photos/:id/note   (trainer) — add / clear feedback note
export const setPhotoNote = asyncHandler(async (req, res) => {
    const photo = await ProgressPhoto.findById(req.params.id)
    if (!photo) throw ApiError.notFound('Photo not found')
    await assertTrainerOwnsClient(req, photo.client)

    const note = (req.body.note || '').trim()
    photo.note = note
    photo.noteAt = note ? new Date() : null
    await photo.save()
    res.json(photo)
})

// DELETE /api/progress-photos/:id   (client owner)
export const deletePhoto = asyncHandler(async (req, res) => {
    const photo = await ProgressPhoto.findById(req.params.id)
    if (!photo) throw ApiError.notFound('Photo not found')
    if (req.user.role === 'client' && String(photo.client) !== String(req.client._id)) throw ApiError.forbidden()
    await photo.deleteOne()
    res.json({ ok: true })
})
