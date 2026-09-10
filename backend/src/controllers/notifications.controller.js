import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Notification } from '../models/index.js'

// GET /api/notifications?unread=1&limit=50
export const listNotifications = asyncHandler(async (req, res) => {
    const filter = { user: req.user._id }
    if (req.query.unread === '1') filter.read = false
    const limit = Math.min(Number(req.query.limit) || 50, 200)

    const [items, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
        Notification.countDocuments({ user: req.user._id, read: false }),
    ])
    res.json({ unreadCount, items })
})

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
    const n = await Notification.findOne({ _id: req.params.id, user: req.user._id })
    if (!n) throw ApiError.notFound('Notification not found')
    n.read = true
    await n.save()
    res.json(n)
})

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true })
    res.json({ ok: true })
})
