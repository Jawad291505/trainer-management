import { asyncHandler } from '../utils/asyncHandler.js'
import { Conversation } from '../models/index.js'
import { isOnline } from '../realtime/presence.js'
import {
    actorFromReq,
    resolveConversation,
    participantUserIds,
    postMessage,
    markConversationRead,
    listThread,
} from '../services/message.service.js'

// REST endpoints mirror the Socket.IO events so a client can work with either
// transport (or both). The socket path is realtime; REST is the fallback / SSR.

// GET /api/conversations
export const listConversations = asyncHandler(async (req, res) => {
    const filter =
        req.user.role === 'trainer' ? { trainer: req.trainer._id } : { client: req.client._id }

    const convos = await Conversation.find(filter)
        .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name avatarColor' } })
        .sort({ lastMessageAt: -1, createdAt: -1 })

    res.json({
        items: convos.map((c) => {
            const { trainerUserId, clientUserId } = participantUserIds(c)
            const otherUserId = req.user.role === 'trainer' ? clientUserId : trainerUserId
            const other = req.user.role === 'trainer' ? c.client?.user : c.trainer?.user
            return {
                id: String(c._id),
                conversationId: String(c._id),
                clientId: String(c.client?._id),
                trainerId: String(c.trainer?._id),
                name: other?.name,
                avatarColor: other?.avatarColor,
                online: isOnline(otherUserId),
                lastMessage: c.lastMessage,
                lastMessageAt: c.lastMessageAt,
                unread: req.user.role === 'trainer' ? c.unreadForTrainer : c.unreadForClient,
            }
        }),
    })
})

// GET /api/conversations/:id/messages   or   /api/conversations/messages?client=<id>
export const listMessages = asyncHandler(async (req, res) => {
    const convo = await resolveConversation(actorFromReq(req), {
        conversationId: req.params.id,
        clientId: req.query.client,
    })
    const items = await listThread(convo)
    // Opening a thread marks the other side's messages as read.
    await markConversationRead(convo, req.user.role)
    res.json({ conversationId: String(convo._id), items })
})

// POST /api/conversations/messages   Body: { conversationId? | clientId?, text }
export const sendMessage = asyncHandler(async (req, res) => {
    const convo = await resolveConversation(actorFromReq(req), {
        conversationId: req.body.conversationId,
        clientId: req.body.clientId,
    })
    const { message } = await postMessage(convo, {
        fromRole: req.user.role,
        senderUserId: req.user._id,
        text: req.body.text,
    })
    res.status(201).json({
        id: String(message._id),
        conversationId: String(convo._id),
        from: message.from,
        text: message.text,
        createdAt: message.createdAt,
        readAt: null,
    })
})

// PATCH /api/conversations/:id/read
export const markRead = asyncHandler(async (req, res) => {
    const convo = await resolveConversation(actorFromReq(req), { conversationId: req.params.id })
    const result = await markConversationRead(convo, req.user.role)
    res.json({ conversationId: String(convo._id), ...result })
})
