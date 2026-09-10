import { Client } from '../models/index.js'

// The set of User ids a given actor shares a conversation channel with — used to
// scope presence broadcasts. A trainer's counterparts are all their assigned
// clients; a client's counterpart is their assigned trainer.
export async function counterpartUserIds(actor) {
    if (actor.role === 'trainer' && actor.trainerId) {
        const clients = await Client.find({ trainer: actor.trainerId }).populate('user', '_id')
        return clients.map((c) => String(c.user?._id)).filter(Boolean)
    }
    if (actor.role === 'client' && actor.clientId) {
        const client = await Client.findById(actor.clientId).populate({
            path: 'trainer',
            select: 'user',
            populate: { path: 'user', select: '_id' },
        })
        const tId = client?.trainer?.user?._id
        return tId ? [String(tId)] : []
    }
    return []
}
