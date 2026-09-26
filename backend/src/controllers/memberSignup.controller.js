import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { notifyAdmins, notifyMember } from '../services/notify.service.js'
import { User, Member, Trainer, SubscriptionPlan } from '../models/index.js'
import { hashPassword } from '../utils/password.js'
import { generateOtp, hashOtp, compareOtp, otpExpiryDate } from '../utils/otp.js'
import { sendOtpEmail } from '../services/email.service.js'
import { signToken } from '../utils/jwt.js'
import { profileFor } from './auth.controller.js'
import { ensureMemberReferralCode, findReferrerByCode, recordMemberReferral } from '../services/memberReferral.service.js'

// Members and self-signup Trainers share the OTP -> plan steps; only the profile
// model differs.
const PROFILE_MODEL = { member: Member, trainer: Trainer }
function assertOnboardee(req) {
    if (!PROFILE_MODEL[req.user.role]) throw ApiError.forbidden()
}

export function issue(user) {
    return signToken({ sub: String(user._id), role: user.role })
}

export async function sendOtp(user) {
    const otp = generateOtp()
    user.otpCodeHash = await hashOtp(otp)
    user.otpExpires = otpExpiryDate()
    await user.save()

    const { sent, reason } = await sendOtpEmail({ to: user.email, name: user.name, otp })
    // Whoever is signing up needs this code to proceed at all — unlike an admin
    // invite, there's no one else to hand it to them, so surface it on failure
    // the same way the invite flow surfaces a failed temp password.
    return { otpSent: sent, otpWarning: sent ? null : reason, devOtp: sent ? undefined : otp }
}

// POST /api/member-signup   (public) — step 1 of self-signup.
// Body: { name, email, password, phone? }
export const signup = asyncHandler(async (req, res) => {
    const { name, email, password, phone, referralCode } = req.body
    if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required')
    if (password.length < 8) throw ApiError.badRequest('Password must be at least 8 characters')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already registered')

    // Validate the code up front so a typo doesn't silently drop the referral.
    const referrer = await findReferrerByCode(referralCode)

    const user = await User.create({
        name,
        email,
        phone,
        role: 'member',
        status: 'pending',
        emailVerified: false,
        passwordHash: await hashPassword(password),
    })
    const member = await Member.create({
        user: user._id,
        status: 'pending',
        onboardingStage: 'verify_email',
    })
    await ensureMemberReferralCode(member)
    if (referrer) await recordMemberReferral(referrer, member)
    await notifyAdmins({
        type: 'user',
        title: 'New member signed up',
        description: referrer ? `${name} signed up using a member referral code (${referrer.referralCode}).` : `${name} started a member signup.`,
    })
    if (referrer) {
        await notifyMember(referrer._id, {
            type: 'referral',
            title: 'Someone used your referral code',
            description: `${name} signed up with your code.`,
        })
    }

    const { otpSent, otpWarning, devOtp } = await sendOtp(user)

    res.status(201).json({
        token: issue(user),
        user: await profileFor(user),
        otpSent,
        ...(otpSent ? {} : { otpWarning, devOtp }),
    })
})

// POST /api/member-signup/resend-otp   (member or trainer, pending)
export const resendOtp = asyncHandler(async (req, res) => {
    assertOnboardee(req)
    if (req.user.emailVerified) throw ApiError.badRequest('Your email is already verified')

    const user = await User.findById(req.user._id)
    const { otpSent, otpWarning, devOtp } = await sendOtp(user)
    res.json({ otpSent, ...(otpSent ? {} : { otpWarning, devOtp }) })
})

// POST /api/member-signup/verify-otp   (member or trainer, pending)   Body: { otp }
export const verifyOtp = asyncHandler(async (req, res) => {
    assertOnboardee(req)
    const { otp } = req.body
    if (!otp) throw ApiError.badRequest('Enter the verification code')

    const user = await User.findById(req.user._id).select('+otpCodeHash +otpExpires')
    if (user.emailVerified) throw ApiError.badRequest('Your email is already verified')
    if (!user.otpCodeHash || !user.otpExpires) throw ApiError.badRequest('No verification code pending — request a new one')
    if (user.otpExpires < new Date()) throw ApiError.badRequest('That code has expired — request a new one')
    if (!(await compareOtp(otp, user.otpCodeHash))) throw ApiError.badRequest('Incorrect verification code')

    user.emailVerified = true
    user.otpCodeHash = undefined
    user.otpExpires = undefined
    await user.save()

    await PROFILE_MODEL[user.role].updateOne({ user: user._id }, { onboardingStage: 'select_plan' })

    res.json({ user: await profileFor(user) })
})

// POST /api/member-signup/select-plan   (member or trainer, pending, email verified)   Body: { planId }
export const selectPlan = asyncHandler(async (req, res) => {
    assertOnboardee(req)
    if (!req.user.emailVerified) throw ApiError.badRequest('Verify your email before selecting a plan')

    const { planId } = req.body
    // Members buy member plans (incl. ones saved before `audience` existed); Trainers buy trainer plans.
    const audienceFilter = req.user.role === 'trainer' ? 'trainer' : { $ne: 'trainer' }
    const plan = planId && await SubscriptionPlan.findOne({ _id: planId, active: true, audience: audienceFilter })
    if (!plan) throw ApiError.badRequest('Select a valid plan')

    await PROFILE_MODEL[req.user.role].updateOne(
        { user: req.user._id },
        { pendingPlan: plan._id, onboardingStage: 'submit_payment' },
    )

    res.json({ user: await profileFor(req.user) })
})
