import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Notification } from '../models/index.js'

// "5 min ago" style label the portals render as `n.time`.
function timeAgo(date) {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} d ago`
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Shape the admin / trainer / client NotificationMenu + NotificationsPage were
// built against (`id`, `desc`, `time`, `unread`), plus the deep-link `ref`.
const serialize = (n) => ({
    id: String(n._id),
    type: n.type,
    title: n.title,
    desc: n.description,
    time: timeAgo(n.createdAt),
    unread: !n.read,
    ref: n.ref?.kind ? { kind: n.ref.kind, id: String(n.ref.id) } : null,
    createdAt: n.createdAt,
})

// GET /api/notifications?unread=1&limit=50
export const listNotifications = asyncHandler(async (req, res) => {
    const filter = { user: req.user._id }
    if (req.query.unread === '1') filter.read = false
    const limit = Math.min(Number(req.query.limit) || 50, 200)

    const [items, unreadCount] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).limit(limit),
        Notification.countDocuments({ user: req.user._id, read: false }),
    ])
    res.json({ unreadCount, items: items.map(serialize) })
})

// PATCH /api/notifications/:id/read
export const markRead = asyncHandler(async (req, res) => {
    const n = await Notification.findOne({ _id: req.params.id, user: req.user._id })
    if (!n) throw ApiError.notFound('Notification not found')
    n.read = true
    await n.save()
    res.json(serialize(n))
})

// PATCH /api/notifications/read-all
export const markAllRead = asyncHandler(async (req, res) => {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true })
    res.json({ ok: true })
})
