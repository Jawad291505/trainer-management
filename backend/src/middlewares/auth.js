import { verifyToken } from '../utils/jwt.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client } from '../models/index.js'

// Routes a pending self-signup Member may reach before Admin approval. Each
// controller still validates the exact onboardingStage ordering (e.g. can't
// submit a payment before verifying the email) — this list is only the outer
// "are you even allowed near this endpoint" gate.
const MEMBER_ONBOARDING_PATHS = new Set([
    '/api/auth/me',
    '/api/member-signup/verify-otp',
    '/api/member-signup/resend-otp',
    '/api/member-signup/select-plan',
    '/api/member-payments',
    '/api/member-payments/me',
    '/api/subscription-plans',
    '/api/organization/bank-details',
])

// Reads `Authorization: Bearer <jwt>`, loads the user, and attaches:
//   req.user     - the User document
//   req.member   - the Member profile (when role === 'member')
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

        const path = req.originalUrl.split('?')[0]

        // Temp-password accounts can only reach GET/PATCH /auth/me until they set
        // a real password — everything else 403s with a code the front-end uses
        // to redirect to the "set a new password" screen (see services/api.js).
        if (user.mustChangePassword && path !== '/api/auth/me') {
            throw ApiError.passwordChangeRequired()
        }

        req.user = user
        req.auth = { userId: String(user._id), role: user.role }

        if (user.role === 'member') {
            req.member = await Member.findOne({ user: user._id })

            // Self-signup Members stay 'pending' through email verification, plan
            // selection and payment review — only the signup/onboarding endpoints
            // (and their own profile) are reachable until an Admin approves them.
            if (req.member && req.member.status === 'pending' && !MEMBER_ONBOARDING_PATHS.has(path)) {
                throw ApiError.memberPendingApproval()
            }
        } else if (user.role === 'trainer') {
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
