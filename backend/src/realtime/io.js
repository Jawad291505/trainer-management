// Tiny holder for the Socket.IO server instance so services and controllers can
// emit realtime events without importing the whole realtime bootstrap (avoids
// circular imports). Set once in realtime/index.js -> initRealtime().
let io = null

export function setIo(instance) {
    io = instance
}

export function getIo() {
    return io
}

// Personal room every socket for a user joins — lets us push to a user across all
// their open tabs/devices.
export const userRoom = (userId) => `user:${userId}`
export const conversationRoom = (conversationId) => `conversation:${conversationId}`

// Tell each user's open tabs that their notifications changed (new ones arrived,
// or some were read) so the sidebar / bell badges refetch their unread count.
export function emitNotificationsChanged(userIds) {
    if (!io) return
    for (const id of new Set(userIds.map(String))) io.to(userRoom(id)).emit('notifications:changed')
}
