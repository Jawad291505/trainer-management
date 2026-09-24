import { Notification, User, Member, Trainer, Client } from '../models/index.js'

// Fire-and-forget in-app notifications. A failure here must never fail the
// request that triggered it, so every helper swallows (and logs) errors.
async function create(docs) {
    try {
        if (docs.length) await Notification.insertMany(docs)
    } catch (err) {
        console.error('[notify] failed to create notification:', err.message)
    }
}

const doc = (user, role, { type, title, description = '', ref }) => ({
    user,
    role,
    type,
    title,
    description,
    ...(ref ? { ref } : {}),
})

// One notification for one user.
export const notifyUser = (userId, role, payload) => create(userId ? [doc(userId, role, payload)] : [])

// Every admin account.
export async function notifyAdmins(payload) {
    const admins = await User.find({ role: 'admin', status: { $ne: 'inactive' } }, '_id')
    await create(admins.map((a) => doc(a._id, 'admin', payload)))
}

// Profile-id variants — resolve the User behind a Member / Trainer / Client.
export async function notifyMember(memberId, payload) {
    const m = memberId && (await Member.findById(memberId, 'user'))
    if (m) await notifyUser(m.user, 'member', payload)
}
export async function notifyTrainer(trainerId, payload) {
    const t = trainerId && (await Trainer.findById(trainerId, 'user'))
    if (t) await notifyUser(t.user, 'trainer', payload)
}
export async function notifyClient(clientId, payload) {
    const c = clientId && (await Client.findById(clientId, 'user'))
    if (c) await notifyUser(c.user, 'client', payload)
}
