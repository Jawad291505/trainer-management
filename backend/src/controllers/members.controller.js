import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client } from '../models/index.js'
import { createInvitedUser } from '../services/invite.service.js'

// Shape a Member + its User (+ trainer/client counts) for the admin Member
// Management page — the replacement primary view for what used to be a flat
// Trainers list (admin/src/portals/admin/pages/Members.jsx).
async function flatten(member) {
    const u = member.user
    const trainerIds = await Trainer.find({ managedBy: member._id }, '_id')
    const clientCount = trainerIds.length
        ? await Client.countDocuments({ trainer: { $in: trainerIds.map((t) => t._id) } })
        : 0
    return {
        id: String(member._id),
        userId: u ? String(u._id) : null,
        name: u?.name,
        email: u?.email,
        avatarColor: u?.avatarColor,
        title: member.title,
        status: member.status,
        trainerCount: trainerIds.length,
        trainerLimit: member.trainerLimit,
        clientCount,
        clientLimit: member.clientLimit,
        // Self-signup only — null for admin-invited members (they skip onboarding
        // entirely and status is 'active' from creation).
        onboardingStage: member.onboardingStage,
        plan: member.plan && typeof member.plan === 'object' ? {
            id: String(member.plan._id || member.plan),
            name: member.plan.name,
            priceMonthly: member.plan.priceMonthly,
            currency: member.plan.currency,
            maxClients: member.plan.maxClients,
            maxTrainers: member.plan.maxTrainers,
        } : null,
        planExpiryDate: member.planExpiryDate,
        joinDate: member.joinDate,
    }
}

// GET /api/members?status=&search=   (admin only)
export const listMembers = asyncHandler(async (req, res) => {
    let members = await Member.find(req.query.status ? { status: req.query.status } : {})
        .populate('user', 'name email avatarColor status')
        .populate('plan')
        .sort({ createdAt: -1 })

    if (req.query.search) {
        const rx = new RegExp(String(req.query.search).trim(), 'i')
        members = members.filter((m) => rx.test(m.user?.name || '') || rx.test(m.user?.email || ''))
    }
    res.json({ count: members.length, items: await Promise.all(members.map(flatten)) })
})

// GET /api/members/:id   (admin only) — includes the trainers assigned to this member
export const getMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id)
        .populate('user', 'name email avatarColor status phone')
        .populate('plan')
    if (!member) throw ApiError.notFound('Member not found')

    const trainers = await Trainer.find({ managedBy: member._id }).populate('user', 'name email avatarColor status')
    res.json({ ...(await flatten(member)), trainers })
})

// POST /api/members   (admin only) — provision a member account via the shared
// invite flow (temp password emailed through Resend). `trainerLimit` sets how
// many trainers this member may have assigned at once (default 5).
export const createMember = asyncHandler(async (req, res) => {
    const { name, email, title, trainerLimit } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')

    const { user, tempPassword, inviteSent, inviteWarning } = await createInvitedUser({
        name,
        email,
        role: 'member',
        avatarColor: req.body.avatarColor,
        status: req.body.status || 'active',
    })
    const member = await Member.create({
        user: user._id,
        title: title || 'Member',
        status: req.body.status || 'active',
        trainerLimit: trainerLimit ?? 5,
    })
    await member.populate('user', 'name email avatarColor status')
    res.status(201).json({
        ...(await flatten(member)),
        ...(inviteSent ? {} : { inviteWarning, tempPassword }),
    })
})

// PATCH /api/members/:id   (admin only) — Super Admin can raise/lower
// trainerLimit at any time; it never forces existing trainers off the member.
export const updateMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id).populate('user', 'name email avatarColor status')
    if (!member) throw ApiError.notFound('Member not found')

    if (req.body.title !== undefined) member.title = req.body.title
    if (req.body.status !== undefined) member.status = req.body.status
    if (req.body.trainerLimit !== undefined) {
        if (req.body.trainerLimit < 0) throw ApiError.badRequest('Trainer limit cannot be negative')
        if (req.body.trainerLimit > member.clientLimit) {
            throw ApiError.badRequest(`Trainer limit cannot exceed the client limit (${member.clientLimit})`)
        }
        member.trainerLimit = req.body.trainerLimit
    }
    await member.save()

    if (member.user && (req.body.name || req.body.email || req.body.status || req.body.avatarColor)) {
        if (req.body.name) member.user.name = req.body.name
        if (req.body.email) member.user.email = req.body.email
        if (req.body.avatarColor) member.user.avatarColor = req.body.avatarColor
        if (req.body.status) member.user.status = req.body.status
        await member.user.save()
    }
    res.json(await flatten(member))
})

// DELETE /api/members/:id   (admin only) — trainers assigned to this member
// fall back to being managed directly by Admin, they are not deleted.
export const deleteMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id)
    if (!member) throw ApiError.notFound('Member not found')

    await Trainer.updateMany({ managedBy: member._id }, { managedBy: null })
    await User.findByIdAndDelete(member.user)
    await member.deleteOne()
    res.json({ ok: true })
})
