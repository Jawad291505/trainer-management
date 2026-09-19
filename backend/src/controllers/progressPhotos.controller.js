import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { ProgressPhoto, Client } from '../models/index.js'
import { uploadProgressPhoto, signProgressPhotoUploads, isOwnProgressPhoto, deleteImage } from '../services/cloudinary.service.js'

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

    // ?summary=1 — counts only. Lets a page show "Photos (3)" without loading the list.
    if (req.query.summary === '1') {
        const [count, pendingReview] = await Promise.all([
            ProgressPhoto.countDocuments({ client: clientId }),
            ProgressPhoto.countDocuments({ client: clientId, $or: [{ note: '' }, { note: null }, { note: { $exists: false } }] }),
        ])
        return res.json({ count, pendingReview })
    }

    const photos = await ProgressPhoto.find({ client: clientId }).sort({ date: -1, createdAt: -1 })

    const body = {
        count: photos.length,
        pendingReview: photos.filter((p) => !p.note).length,
        items: photos,
    }

    // `groups` repeats every photo a second time, and both portals group `items`
    // themselves — so it's opt-in via ?groups=1.
    if (req.query.groups === '1') {
        const groups = new Map()
        for (const p of photos) {
            const key = p.date.toISOString().slice(0, 10)
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key).push(p)
        }
        body.groups = [...groups.entries()].map(([date, items]) => ({ date, items }))
    }
    res.json(body)
})

// POST /api/progress-photos/upload-signatures   (client)  Body: { count }
// Step 1 of a direct-to-Cloudinary upload: signed params for `count` photos.
export const signUploads = asyncHandler(async (req, res) => {
    const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 10)
    try {
        res.json(signProgressPhotoUploads({ clientId: req.client._id, count }))
    } catch (err) {
        throw ApiError.badRequest(err.message || 'Photo uploads are not available')
    }
})

// POST /api/progress-photos   (client)
// Body: { imageUrl, imagePublicId, angle, caption, date } — the photo was already
// uploaded straight to Cloudinary (see signUploads). The legacy { image: dataUrl }
// body is still accepted and uploaded server-side.
export const uploadPhoto = asyncHandler(async (req, res) => {
    const { image, imageUrl, imagePublicId, angle, caption, date } = req.body

    let uploaded
    if (imageUrl) {
        if (!isOwnProgressPhoto({ url: imageUrl, publicId: imagePublicId }, req.client._id)) {
            throw ApiError.badRequest('Invalid photo reference')
        }
        uploaded = { url: imageUrl, publicId: imagePublicId }
    } else {
        if (!image) throw ApiError.badRequest('imageUrl (or image data URL) is required')
        if (typeof image !== 'string' || !image.startsWith('data:image/')) {
            throw ApiError.badRequest('image must be an image data URL')
        }
        // Only the Cloudinary URL is stored, never the image bytes.
        try {
            uploaded = await uploadProgressPhoto(image, { clientId: req.client._id })
        } catch (err) {
            throw ApiError.badRequest(err.message || 'Could not upload the photo')
        }
    }

    const photo = await ProgressPhoto.create({
        client: req.client._id,
        trainer: req.client.trainer || null,
        date: date ? new Date(date) : new Date(),
        image: uploaded.url,
        imagePublicId: uploaded.publicId,
        angle: angle || 'front',
        caption: caption || '',
    })
    res.status(201).json(photo)
})

// PATCH /api/progress-photos/:id   (client owner) — edit the caption
export const updateCaption = asyncHandler(async (req, res) => {
    const photo = await ProgressPhoto.findById(req.params.id)
    if (!photo) throw ApiError.notFound('Photo not found')
    if (String(photo.client) !== String(req.client._id)) throw ApiError.forbidden()

    photo.caption = String(req.body.caption ?? '').trim().slice(0, 140)
    await photo.save()
    res.json(photo)
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
    deleteImage(photo.imagePublicId).catch((err) => console.warn('[cloudinary] delete failed:', err.message))
    res.json({ ok: true })
})
