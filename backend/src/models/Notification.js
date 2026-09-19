import mongoose from 'mongoose'

// In-app notifications. Every portal has a NotificationMenu + NotificationsPage.
// Types seen across the apps: message, followup, progress, session, payment,
// user, capacity, library, plan, diet. Kept as a free string so new event kinds
// don't require a migration.
const notificationSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        role: { type: String, enum: ['admin', 'trainer', 'client'], required: true },
        type: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        read: { type: Boolean, default: false, index: true },
        // Optional deep-link target, e.g. { kind: 'client', id: '...' }.
        ref: {
            kind: { type: String, default: null },
            id: { type: mongoose.Schema.Types.ObjectId, default: null },
        },
    },
    { timestamps: true },
)

// Bell/list reads: a user's newest notifications.
notificationSchema.index({ user: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
