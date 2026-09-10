import { verifyToken } from '../utils/jwt.js'
import ApiError from '../utils/ApiError.js'
import { User, Trainer, Client } from '../models/index.js'

// Reads `Authorization: Bearer <jwt>`, loads the user, and attaches:
//   req.user     - the User document
//   req.trainer  - the Trainer profile (when role === 'trainer')
//   req.client   - the Client profile (when role === 'client')
export async function authenticate(req, _res, next) {
    try {
        const header = req.headers.authorization || ''
        const token = header.startsWith('Bearer ') ? header.slice(7) : null
        if (!token) throw ApiError.unauthorized('Missing bearer token')

        let payload
        try {
            payload = verifyToken(token)
        } catch {
            throw ApiError.unauthorized('Invalid or expired token')
        }

        const user = await User.findById(payload.sub)
        if (!user) throw ApiError.unauthorized('Account no longer exists')
        if (user.status === 'inactive') throw ApiError.forbidden('Account is inactive')

        req.user = user
        req.auth = { userId: String(user._id), role: user.role }

        if (user.role === 'trainer') {
            req.trainer = await Trainer.findOne({ user: user._id })
        } else if (user.role === 'client') {
            req.client = await Client.findOne({ user: user._id })
        }

        // Best-effort "last seen" without blocking the request.
        User.updateOne({ _id: user._id }, { lastActivity: new Date() }).catch(() => {})

        next()
    } catch (err) {
        next(err)
    }
}

// Restrict a route to one or more roles: authorize('admin'), authorize('trainer','admin')
export const authorize =
    (...roles) =>
    (req, _res, next) => {
        if (!req.user) return next(ApiError.unauthorized())
        if (roles.length && !roles.includes(req.user.role)) {
            return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`))
        }
        next()
    }
