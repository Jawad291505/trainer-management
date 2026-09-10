import { verifyToken } from '../utils/jwt.js'
import { User, Trainer, Client } from '../models/index.js'

// Socket.IO handshake auth. The client connects with:
//   io(URL, { auth: { token: '<jwt>' } })
// (an `Authorization: Bearer` header is also accepted).
export async function socketAuth(socket, next) {
    try {
        const raw =
            socket.handshake.auth?.token ||
            (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '')
        if (!raw) return next(new Error('unauthorized: missing token'))

        let payload
        try {
            payload = verifyToken(raw)
        } catch {
            return next(new Error('unauthorized: invalid or expired token'))
        }

        const user = await User.findById(payload.sub)
        if (!user) return next(new Error('unauthorized: account not found'))
        if (user.status === 'inactive') return next(new Error('forbidden: account inactive'))

        const actor = {
            role: user.role,
            userId: String(user._id),
            trainerId: null,
            clientId: null,
        }
        if (user.role === 'trainer') {
            const t = await Trainer.findOne({ user: user._id }, '_id')
            actor.trainerId = t ? String(t._id) : null
        } else if (user.role === 'client') {
            const c = await Client.findOne({ user: user._id }, '_id trainer')
            actor.clientId = c ? String(c._id) : null
        }

        socket.data.user = { id: String(user._id), name: user.name, role: user.role }
        socket.data.actor = actor
        next()
    } catch (err) {
        next(err)
    }
}
