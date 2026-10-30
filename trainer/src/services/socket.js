import { io } from 'socket.io-client'
import { getToken } from './api'

const URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'
let socket = null

// One shared socket per session. Reused while it is still connecting (the badge
// provider and the Messages page both ask for it on load); replaced only when the
// signed-in token changes.
export function getSocket() {
    const token = getToken()
    if (!token) return null
    if (socket && socket.auth?.token === token) return socket
    disconnectSocket()

    socket = io(URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
    })
    return socket
}

export function disconnectSocket() {
    if (socket) { socket.disconnect(); socket = null }
}
