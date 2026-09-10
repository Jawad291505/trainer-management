// In-memory presence tracking. Maps a userId -> Set of live socket ids. A user is
// "online" while they have at least one connected socket.
//
// This is process-local. For a multi-instance deployment, swap this module for a
// Redis-backed set + the socket.io-redis adapter; the public functions stay the same.
const sockets = new Map() // userId -> Set<socketId>

export function addSocket(userId, socketId) {
    const id = String(userId)
    if (!sockets.has(id)) sockets.set(id, new Set())
    sockets.get(id).add(socketId)
    return sockets.get(id).size === 1 // true => user just came online
}

export function removeSocket(userId, socketId) {
    const id = String(userId)
    const set = sockets.get(id)
    if (!set) return false
    set.delete(socketId)
    if (set.size === 0) {
        sockets.delete(id)
        return true // true => user just went offline
    }
    return false
}

export function isOnline(userId) {
    return sockets.has(String(userId))
}

// Filter a list of userIds down to those currently online (as strings).
export function onlineAmong(userIds = []) {
    return userIds.map(String).filter((id) => sockets.has(id))
}
