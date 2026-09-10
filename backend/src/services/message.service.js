import ApiError from '../utils/ApiError.js'
import { Conversation, Message, Client, Notification } from '../models/index.js'
import { getIo, userRoom, conversationRoom } from '../realtime/io.js'
import { isOnline } from '../realtime/presence.js'

// Normalised caller context used by both the REST controller and the socket
// handlers: { role, userId, trainerId, clientId }.

// Resolve (creating if needed) the single conversation for a trainer<->client
// pair and assert the caller is one of the two participants. Returns a
// Conversation populated with `trainer.user` and `client.user`.
export async function resolveConversation(actor, { conversationId, clientId } = {}) {
    let convo

    if (conversationId) {
        convo = await Conversation.findById(conversationId)
        if (!convo) throw ApiError.notFound('Conversation not found')
    } else if (actor.role === 'trainer') {
        const client = await Client.findById(clientId)
        if (!client || String(client.trainer) !== String(actor.trainerId)) {
            throw ApiError.forbidden('That client is not assigned to you')
        }
        convo = await Conversation.findOneAndUpdate(
            { trainer: actor.trainerId, client: client._id },
            { $setOnInsert: { trainer: actor.trainerId, client: client._id } },
            { new: true, upsert: true },
        )
    } else if (actor.role === 'client') {
        const client = await Client.findById(actor.clientId)
        if (!client?.trainer) throw ApiError.badRequest('You have no assigned trainer')
        convo = await Conversation.findOneAndUpdate(
            { trainer: client.trainer, client: client._id },
            { $setOnInsert: { trainer: client.trainer, client: client._id } },
            { new: true, upsert: true },
        )
    } else {
        throw ApiError.forbidden('Only trainers and clients have conversations')
    }

    await convo.populate([
        { path: 'trainer', select: 'user', populate: { path: 'user', select: 'name avatarColor' } },
        { path: 'client', select: 'user', populate: { path: 'user', select: 'name avatarColor' } },
    ])

    const mine =
        (actor.role === 'trainer' && String(convo.trainer?._id) === String(actor.trainerId)) ||
        (actor.role === 'client' && String(convo.client?._id) === String(actor.clientId))
    if (!mine) throw ApiError.forbidden('You are not a participant in this conversation')

    return convo
}

// The two User ids behind a populated conversation.
export function participantUserIds(convo) {
    return {
        trainerUserId: convo.trainer?.user?._id ? String(convo.trainer.user._id) : String(convo.trainer?.user),
        clientUserId: convo.client?.user?._id ? String(convo.client.user._id) : String(convo.client?.user),
    }
}

// Shape the per-recipient "conversation row" the front-end conversation list uses.
function rowFor(convo, forRole) {
    return {
        id: String(convo._id),
        conversationId: String(convo._id),
        clientId: String(convo.client?._id),
        trainerId: String(convo.trainer?._id),
        lastMessage: convo.lastMessage,
        lastMessageAt: convo.lastMessageAt,
        unread: forRole === 'trainer' ? convo.unreadForTrainer : convo.unreadForClient,
    }
}

function emitConversationUpdated(convo) {
    const io = getIo()
    if (!io) return
    const { trainerUserId, clientUserId } = participantUserIds(convo)
    io.to(userRoom(trainerUserId)).emit('conversation:updated', rowFor(convo, 'trainer'))
    io.to(userRoom(clientUserId)).emit('conversation:updated', rowFor(convo, 'client'))
}

// Persist a message, bump the conversation, push realtime events, and notify the
// recipient if they are offline. Returns the saved Message (lean-ish object).
export async function postMessage(convo, { fromRole, senderUserId, text }) {
    const clean = String(text || '').trim()
    if (!clean) throw ApiError.badRequest('text is required')
    if (clean.length > 4000) throw ApiError.badRequest('Message too long (max 4000 chars)')

    const message = await Message.create({
        conversation: convo._id,
        from: fromRole,
        sender: senderUserId,
        text: clean,
    })

    convo.lastMessage = clean.slice(0, 140)
    convo.lastMessageAt = message.createdAt
    if (fromRole === 'trainer') convo.unreadForClient += 1
    else convo.unreadForTrainer += 1
    await convo.save()

    const payload = {
        conversationId: String(convo._id),
        message: {
            id: String(message._id),
            conversationId: String(convo._id),
            from: message.from,
            text: message.text,
            createdAt: message.createdAt,
            readAt: null,
        },
    }

    const io = getIo()
    if (io) io.to(conversationRoom(convo._id)).emit('message:new', payload)
    emitConversationUpdated(convo)

    // Offline recipient -> drop an in-app Notification so it shows in their bell.
    const { trainerUserId, clientUserId } = participantUserIds(convo)
    const recipientUserId = fromRole === 'trainer' ? clientUserId : trainerUserId
    const recipientRole = fromRole === 'trainer' ? 'client' : 'trainer'
    if (!isOnline(recipientUserId)) {
        await Notification.create({
            user: recipientUserId,
            role: recipientRole,
            type: 'message',
            title: 'New message',
            description: clean.slice(0, 120),
            ref: { kind: 'conversation', id: convo._id },
        })
    }

    return { message, payload }
}

// Mark every message from the OTHER side as read for `readerRole`, reset that
// side's unread counter, and emit a read receipt to the conversation room.
export async function markConversationRead(convo, readerRole) {
    const otherFrom = readerRole === 'trainer' ? 'client' : 'trainer'

    const unread = await Message.find(
        { conversation: convo._id, from: otherFrom, readAt: null },
        '_id',
    )
    const readAt = new Date()
    if (unread.length) {
        await Message.updateMany(
            { conversation: convo._id, from: otherFrom, readAt: null },
            { readAt },
        )
    }

    if (readerRole === 'trainer') convo.unreadForTrainer = 0
    else convo.unreadForClient = 0
    await convo.save()

    const io = getIo()
    if (io && unread.length) {
        io.to(conversationRoom(convo._id)).emit('message:read', {
            conversationId: String(convo._id),
            by: readerRole,
            readAt,
            messageIds: unread.map((m) => String(m._id)),
        })
    }
    emitConversationUpdated(convo)

    return { readAt, messageIds: unread.map((m) => String(m._id)), count: unread.length }
}

// Full thread for a conversation (ascending).
export async function listThread(convo) {
    const messages = await Message.find({ conversation: convo._id }).sort({ createdAt: 1 })
    return messages.map((m) => ({
        id: String(m._id),
        conversationId: String(convo._id),
        from: m.from,
        text: m.text,
        createdAt: m.createdAt,
        readAt: m.readAt,
    }))
}

// Actor helper from an Express req (populated by middlewares/auth.js).
export const actorFromReq = (req) => ({
    role: req.user.role,
    userId: String(req.user._id),
    trainerId: req.trainer?._id ? String(req.trainer._id) : null,
    clientId: req.client?._id ? String(req.client._id) : null,
})
