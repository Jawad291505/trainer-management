import { io } from 'socket.io-client'
import { getToken } from './api'

const URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'
let socket = null

export function getSocket() {
    if (socket?.connected) return socket
    const token = getToken()
    if (!token) return null

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
