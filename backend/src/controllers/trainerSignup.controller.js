import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { notifyAdmins } from '../services/notify.service.js'
import { User, Trainer } from '../models/index.js'
import { hashPassword } from '../utils/password.js'
import { ensureReferralCode, redeemReferralCode } from '../services/referral.service.js'
import { profileFor } from './auth.controller.js'
import { issue, sendOtp } from './memberSignup.controller.js'

// POST /api/trainer-signup   (public) — step 1 of trainer self-signup.
// Body: { name, email, password, phone?, specialization?, referralCode? }
// The remaining steps (verify-otp -> select-plan -> payment) reuse the
// /member-signup/* and /member-payments endpoints, which serve both roles.
// A self-signup trainer is always 'outsourced': independent, own plan, own clients.
export const signup = asyncHandler(async (req, res) => {
    const { name, email, password, phone, specialization, referralCode } = req.body
    if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required')
    if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already registered')

    const user = await User.create({
        name,
        email,
        phone,
        role: 'trainer',
        status: 'pending',
        emailVerified: false,
        passwordHash: await hashPassword(password),
    })
    const trainer = await Trainer.create({
        user: user._id,
        affiliation: 'outsourced',
        specialization: specialization?.trim() || undefined,
        status: 'pending',
        onboardingStage: 'verify_email',
        // Real capacity comes from the plan on approval; nothing can be assigned before then.
        capacity: 0,
    })
    await ensureReferralCode(trainer)

    // Non-fatal, like the admin-side register flow: the account exists either way.
    let referralWarning
    if (referralCode?.trim()) {
        try {
            await redeemReferralCode(trainer, referralCode)
        } catch (e) {
            referralWarning = e.message
        }
    }

    await notifyAdmins({
        type: 'user',
        title: 'New trainer signed up',
        description: `${name} started an independent trainer signup.`,
    })

    const { otpSent, otpWarning, devOtp } = await sendOtp(user)

    res.status(201).json({
        token: issue(user),
        user: await profileFor(user),
        otpSent,
        ...(otpSent ? {} : { otpWarning, devOtp }),
        ...(referralWarning ? { referralWarning } : {}),
    })
})
