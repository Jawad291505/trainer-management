import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { fetchLinkPreview } from '../services/linkPreview.service.js'

// GET /api/link-preview?url=   -> { url, title, description, image, siteName }
// Metadata for a product/reference link (meal supplements in the diet-plan builder).
export const getLinkPreview = asyncHandler(async (req, res) => {
    if (!req.query.url) throw ApiError.badRequest('url is required')
    res.json(await fetchLinkPreview(req.query.url))
})
