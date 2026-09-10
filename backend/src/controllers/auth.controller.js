import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { hashPassword, comparePassword } from '../utils/password.js'
import { signToken } from '../utils/jwt.js'
import { User, Trainer, Client } from '../models/index.js'
import { ensureReferralCode, redeemReferralCode } from '../services/referral.service.js'
import { ROLES } from '../config/constants.js'

// Assemble the "who am I" payload the front-end AuthContext needs.
async function profileFor(user) {
    const base = user.toJSON()
    if (user.role === ROLES.TRAINER) {
        const trainer = await Trainer.findOne({ user: user._id }).populate('referredBy', 'referralCode')
        return { ...base, trainer: trainer ? trainer.toJSON() : null }
    }
    if (user.role === ROLES.CLIENT) {
        const client = await Client.findOne({ user: user._id }).populate({
            path: 'trainer',
            populate: { path: 'user', select: 'name email avatarColor' },
        })
        return { ...base, client: client ? client.toJSON() : null }
    }
    return base
}

function issue(user) {
    return signToken({ sub: String(user._id), role: user.role })
}

// POST /api/auth/register
// Body: { name, email, password, role, ...roleFields }
// role 'admin' registration is allowed only when no admin exists yet (bootstrap).
export const register = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body
    if (!name || !email || !password || !role) {
        throw ApiError.badRequest('name, email, password and role are required')
    }
    if (!Object.values(ROLES).includes(role)) throw ApiError.badRequest('Invalid role')

    if (role === ROLES.ADMIN) {
        const adminExists = await User.exists({ role: ROLES.ADMIN })
        if (adminExists) throw ApiError.forbidden('Admin accounts are provisioned internally')
    }

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) throw ApiError.conflict('Email already registered')

    const user = await User.create({
        name,
        email,
        role,
        passwordHash: await hashPassword(password),
        avatarColor: req.body.avatarColor,
        phone: req.body.phone,
    })

    if (role === ROLES.TRAINER) {
        const trainer = await Trainer.create({
            user: user._id,
            specialization: req.body.specialization,
            capacity: req.body.capacity,
        })
        await ensureReferralCode(trainer)
        if (req.body.referralCode) {
            try {
                await redeemReferralCode(trainer, req.body.referralCode)
            } catch (e) {
                // Non-fatal: account is created, referral simply not applied.
                res.set('X-Referral-Warning', e.message)
            }
        }
    } else if (role === ROLES.CLIENT) {
        await Client.create({
            user: user._id,
            goal: req.body.goal,
            plan: req.body.plan,
            startWeight: req.body.startWeight,
            weight: req.body.weight,
            target: req.body.target,
        })
    }

    res.status(201).json({ token: issue(user), user: await profileFor(user) })
})

// POST /api/auth/login  Body: { email, password }
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) throw ApiError.badRequest('email and password are required')

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')
    if (!user || !(await comparePassword(password, user.passwordHash))) {
        throw ApiError.unauthorized('Invalid email or password')
    }
    if (user.status === 'inactive') throw ApiError.forbidden('Account is inactive')

    res.json({ token: issue(user), user: await profileFor(user) })
})

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
    res.json({ user: await profileFor(req.user) })
})

// PATCH /api/auth/me  — update own name / phone / avatarColor / password
export const updateMe = asyncHandler(async (req, res) => {
    const { name, phone, avatarColor, currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+passwordHash')

    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone
    if (avatarColor !== undefined) user.avatarColor = avatarColor

    if (newPassword) {
        if (!currentPassword || !(await comparePassword(currentPassword, user.passwordHash))) {
            throw ApiError.badRequest('Current password is incorrect')
        }
        user.passwordHash = await hashPassword(newPassword)
    }

    await user.save()
    res.json({ user: await profileFor(user) })
})
