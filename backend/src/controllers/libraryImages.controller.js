import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { uploadLibraryImage, libraryImagePublicId, LIBRARY_IMAGE_KINDS } from '../services/cloudinary.service.js'

// Validates an optional image field on a food or meal payload: '' clears it,
// anything else must be a URL returned by uploadImage() below.
export function libraryImageOrEmpty(value, label = 'image') {
    const url = String(value ?? '').trim()
    if (!url) return ''
    if (!libraryImagePublicId(url)) throw ApiError.badRequest(`Invalid ${label} — upload the image again`)
    return url
}

// POST /api/library-images   (admin, member, trainer)   multipart: { image, kind: 'food' | 'meal' }
// Step 1 of attaching a photo to a food or meal: the file goes to Cloudinary and
// the URL comes back; the food/meal save then stores that URL.
export const uploadImage = asyncHandler(async (req, res) => {
    const kind = String(req.body?.kind || '')
    if (!LIBRARY_IMAGE_KINDS.includes(kind)) throw ApiError.badRequest(`kind must be one of: ${LIBRARY_IMAGE_KINDS.join(', ')}`)
    if (!req.file) throw ApiError.badRequest('An image file is required')
    try {
        const { url } = await uploadLibraryImage(req.file.buffer, { kind, userId: req.user._id })
        res.status(201).json({ url })
    } catch (err) {
        throw ApiError.badRequest(err.message || 'Could not upload the image')
    }
})
