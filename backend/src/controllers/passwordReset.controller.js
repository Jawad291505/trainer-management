import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/index.js'
import { ROLES } from '../config/constants.js'
import { hashPassword } from '../utils/password.js'
import { generateOtp, hashOtp, compareOtp, otpExpiryDate } from '../utils/otp.js'
import { verifyToken } from '../utils/jwt.js'
import { sendPasswordResetEmail } from '../services/email.service.js'
import { env } from '../config/env.js'
import jwt from 'jsonwebtoken'

// Forgot password: emailed OTP -> verify -> set a new password.
// Super admin accounts are deliberately excluded — their password can only be
// changed from inside an authenticated session — and every endpoint answers
// the same way whether or not the email exists, so it can't be used to probe
// which addresses are registered.

const MAX_ATTEMPTS = 5
const VERIFIED_WINDOW_MS = 10 * 60 * 1000
const RESET_ROLES = [ROLES.MEMBER, ROLES.TRAINER, ROLES.CLIENT]
const GENERIC = { ok: true, message: 'If an account exists for that email, a verification code has been sent.' }

const normEmail = (e) => String(e || '').trim().toLowerCase()

async function findResettable(email, extraSelect = '') {
    const query = User.findOne({ email: normEmail(email) })
    if (extraSelect) query.select(extraSelect)
    const user = await query
    if (!user || !RESET_ROLES.includes(user.role) || user.status === 'inactive') return null
    return user
}

// POST /api/auth/forgot-password   (public)   Body: { email }
export const forgotPassword = asyncHandler(async (req, res) => {
    if (!normEmail(req.body.email)) throw ApiError.badRequest('Enter your email')

    const user = await findResettable(req.body.email)
    if (user) {
        // Throttle: one code per minute per account.
        const last = user.resetOtpExpires ? user.resetOtpExpires.getTime() - env.otpExpiryMinutes * 60 * 1000 : 0
        if (Date.now() - last > 60 * 1000) {
            const otp = generateOtp()
            user.resetOtpHash = await hashOtp(otp)
            user.resetOtpExpires = otpExpiryDate()
            user.resetOtpAttempts = 0
            user.resetVerifiedUntil = undefined
            await user.save()
            await sendPasswordResetEmail({ to: user.email, name: user.name, otp })
        }
    }
    res.json(GENERIC)
})

// POST /api/auth/verify-reset-otp   (public)   Body: { email, otp }
// Returns a short-lived `resetToken` that authorises exactly one reset-password call.
export const verifyResetOtp = asyncHandler(async (req, res) => {
    const otp = String(req.body.otp || '').trim()
    if (!normEmail(req.body.email) || !otp) throw ApiError.badRequest('Enter the verification code')

    const user = await findResettable(req.body.email, '+resetOtpHash +resetOtpExpires +resetOtpAttempts')
    const invalid = () => ApiError.badRequest('That code is incorrect or has expired')
    if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) throw invalid()
    if (user.resetOtpAttempts >= MAX_ATTEMPTS) throw ApiError.badRequest('Too many attempts — request a new code')

    if (!(await compareOtp(otp, user.resetOtpHash))) {
        user.resetOtpAttempts += 1
        await user.save()
        throw invalid()
    }

    user.resetOtpHash = undefined
    user.resetOtpExpires = undefined
    user.resetOtpAttempts = 0
    user.resetVerifiedUntil = new Date(Date.now() + VERIFIED_WINDOW_MS)
    await user.save()

    const resetToken = jwt.sign({ sub: String(user._id), purpose: 'password-reset' }, env.jwtSecret, { expiresIn: '10m' })
    res.json({ ok: true, resetToken })
})

// POST /api/auth/reset-password   (public)   Body: { resetToken, newPassword }
export const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body
    if (!resetToken || !newPassword) throw ApiError.badRequest('resetToken and newPassword are required')
    if (String(newPassword).length < 8) throw ApiError.badRequest('Password must be at least 8 characters')

    let payload
    try {
        payload = verifyToken(resetToken)
    } catch {
        throw ApiError.badRequest('This reset session has expired — start again')
    }
    if (payload.purpose !== 'password-reset') throw ApiError.badRequest('Invalid reset session')

    const user = await User.findById(payload.sub).select('+resetVerifiedUntil')
    if (!user || !RESET_ROLES.includes(user.role) || !user.resetVerifiedUntil || user.resetVerifiedUntil < new Date()) {
        throw ApiError.badRequest('This reset session has expired — start again')
    }

    user.passwordHash = await hashPassword(newPassword)
    user.resetVerifiedUntil = undefined
    // They've just chosen their own password, so a pending temp-password lock no longer applies.
    user.mustChangePassword = false
    user.tempPasswordExpires = undefined
    await user.save()

    res.json({ ok: true, message: 'Password updated — you can now sign in.' })
})
