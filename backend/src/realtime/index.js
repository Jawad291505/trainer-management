import { Server } from 'socket.io'
import { env } from '../config/env.js'
import { setIo, userRoom, conversationRoom } from './io.js'
import { socketAuth } from './socketAuth.js'
import { addSocket, removeSocket, onlineAmong } from './presence.js'
import { counterpartUserIds } from './counterparts.js'
import {
    resolveConversation,
    postMessage,
    markConversationRead,
    listThread,
} from '../services/message.service.js'

// Safely run an async socket handler and reply through the ack callback.
function handle(cb, fn) {
    Promise.resolve()
        .then(fn)
        .then((data) => typeof cb === 'function' && cb({ ok: true, ...(data || {}) }))
        .catch((err) => {
            const message = err?.message || 'Socket error'
            if (typeof cb === 'function') cb({ ok: false, error: message })
        })
}

export function initRealtime(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: env.corsOrigins.length ? env.corsOrigins : true,
            credentials: true,
        },
        // path stays the default '/socket.io'
    })
    setIo(io)

    io.use(socketAuth)

    io.on('connection', async (socket) => {
        const { actor, user } = socket.data
        socket.join(userRoom(actor.userId))

        // ---- Presence: announce myself + snapshot my counterparts ----
        let counterparts = []
        try {
            counterparts = await counterpartUserIds(actor)
        } catch {
            counterparts = []
        }
        const justCameOnline = addSocket(actor.userId, socket.id)
        if (justCameOnline) {
            counterparts.forEach((uid) =>
                io.to(userRoom(uid)).emit('presence:update', { userId: actor.userId, online: true }),
            )
        }
        socket.emit('presence:snapshot', { online: onlineAmong(counterparts) })

        // ---- Open a conversation (join its room + mark the other side read) ----
        socket.on('conversation:open', (payload = {}, cb) =>
            handle(cb, async () => {
                const convo = await resolveConversation(actor, {
                    conversationId: payload.conversationId,
                    clientId: payload.clientId,
                })
                socket.join(conversationRoom(convo._id))
                const messages = await listThread(convo)
                const read = await markConversationRead(convo, actor.role)
                return {
                    conversationId: String(convo._id),
                    messages,
                    readReceipt: read,
                }
            }),
        )

        socket.on('conversation:leave', (payload = {}) => {
            if (payload.conversationId) socket.leave(conversationRoom(payload.conversationId))
        })

        // ---- Send a message ----
        socket.on('message:send', (payload = {}, cb) =>
            handle(cb, async () => {
                const convo = await resolveConversation(actor, {
                    conversationId: payload.conversationId,
                    clientId: payload.clientId,
                })
                socket.join(conversationRoom(convo._id))
                const { message } = await postMessage(convo, {
                    fromRole: actor.role,
                    senderUserId: actor.userId,
                    text: payload.text,
                })
                // The full message also arrives via the room 'message:new' event;
                // the ack lets the sender reconcile its optimistic bubble.
                return {
                    tempId: payload.tempId ?? null,
                    message: {
                        id: String(message._id),
                        conversationId: String(convo._id),
                        from: message.from,
                        text: message.text,
                        createdAt: message.createdAt,
                        readAt: null,
                    },
                }
            }),
        )

        // ---- Read receipt (thread opened / scrolled to bottom) ----
        socket.on('message:read', (payload = {}, cb) =>
            handle(cb, async () => {
                const convo = await resolveConversation(actor, {
                    conversationId: payload.conversationId,
                    clientId: payload.clientId,
                })
                const result = await markConversationRead(convo, actor.role)
                return { conversationId: String(convo._id), ...result }
            }),
        )

        // ---- Typing indicator (ephemeral, not persisted) ----
        socket.on('typing', (payload = {}) => {
            if (!payload.conversationId) return
            socket.to(conversationRoom(payload.conversationId)).emit('typing', {
                conversationId: payload.conversationId,
                userId: actor.userId,
                from: actor.role,
                name: user.name,
                isTyping: !!payload.isTyping,
            })
        })

        // ---- Presence query ----
        socket.on('presence:get', (payload = {}, cb) =>
            handle(cb, async () => {
                const ids = Array.isArray(payload.userIds) && payload.userIds.length
                    ? payload.userIds
                    : await counterpartUserIds(actor)
                return { online: onlineAmong(ids) }
            }),
        )

        // ---- Disconnect ----
        socket.on('disconnect', () => {
            const wentOffline = removeSocket(actor.userId, socket.id)
            if (wentOffline) {
                counterparts.forEach((uid) =>
                    io.to(userRoom(uid)).emit('presence:update', {
                        userId: actor.userId,
                        online: false,
                    }),
                )
            }
        })
    })

    console.log('[realtime] Socket.IO ready on path /socket.io')
    return io
}
