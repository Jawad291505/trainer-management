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

// "Last seen" is best-effort; writing it on every request is pure DB churn, so
// it is only refreshed when the stored value is older than this.
const ACTIVITY_WRITE_INTERVAL_MS = 60_000

// Role -> [profile model, req property].
const PROFILES = {
    member: [Member, 'member'],
    trainer: [Trainer, 'trainer'],
    client: [Client, 'client'],
}

// Reads `Authorization: Bearer <jwt>`, loads the user, and attaches:
//   req.user     - the User document
//   req.member   - the Member profile (when role === 'member')
//   req.trainer  - the Trainer profile (when role === 'trainer')
//   req.client   - the Client profile (when role === 'client')
export async function authenticate(req, _res, next) {
    // Every router in routes/ is mounted at '/' with its own router.use(authenticate),
    // so one request can pass through this middleware several times. Authenticating
    // once is enough — repeating it re-ran two DB reads and a write per router.
    if (req.user) return next()
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

        // Purpose-scoped tokens (e.g. password reset) are not login sessions.
        if (payload.purpose) throw ApiError.unauthorized('Invalid or expired token')

        // The token already names the role, so the role's profile is fetched in
        // parallel with the user (one DB round trip instead of two). It is only
        // used if the user's current role still matches; otherwise it's re-read below.
        const guess = PROFILES[payload.role]
        const [user, guessedProfile] = await Promise.all([
            User.findById(payload.sub),
            guess ? guess[0].findOne({ user: payload.sub }) : null,
        ])
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

        const own = PROFILES[user.role]
        if (own) {
            req[own[1]] = own === guess ? guessedProfile : await own[0].findOne({ user: user._id })
        }

        // Same gate for a self-signup (outsourced) Trainer — status 'pending' until Admin
        // approves their payment. Admin/member-created trainers are never 'pending'.
        if (user.role === 'trainer' && req.trainer && req.trainer.status === 'pending' && req.trainer.onboardingStage
            && !MEMBER_ONBOARDING_PATHS.has(path)) {
            throw ApiError.memberPendingApproval()
        }

        // Self-signup Members stay 'pending' through email verification, plan
        // selection and payment review — only the signup/onboarding endpoints
        // (and their own profile) are reachable until an Admin approves them.
        if (user.role === 'member' && req.member && req.member.status === 'pending' && !MEMBER_ONBOARDING_PATHS.has(path)) {
            throw ApiError.memberPendingApproval()
        }

        // A Member whose paid period has lapsed keeps their account but loses access
        // until an Admin records a renewal. Members with no expiry (admin-created,
        // never on a plan) are unaffected.
        if (user.role === 'member' && req.member?.status === 'active' && req.member.planExpiryDate
            && req.member.planExpiryDate < new Date() && path !== '/api/auth/me') {
            throw ApiError.planExpired()
        }

        // Same lock for a subscribed Trainer whose paid period has lapsed. Trainers
        // created by Admin/a Member have no expiry and are unaffected.
        if (user.role === 'trainer' && req.trainer?.status === 'active' && req.trainer.planExpiryDate
            && req.trainer.planExpiryDate < new Date() && path !== '/api/auth/me') {
            throw ApiError.planExpired()
        }

        // Best-effort "last seen" without blocking the request.
        const seenAt = user.lastActivity ? new Date(user.lastActivity).getTime() : 0
        if (Date.now() - seenAt > ACTIVITY_WRITE_INTERVAL_MS) {
            User.updateOne({ _id: user._id }, { lastActivity: new Date() }).catch(() => {})
        }

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
