import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client, SubscriptionPlan, MemberPayment } from '../models/index.js'
import { createInvitedUser } from '../services/invite.service.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

// Shape a Member + its User (+ trainer/client counts) for the admin Member
// Management page — the replacement primary view for what used to be a flat
// Trainers list (admin/src/portals/admin/pages/Members.jsx).
//
// Trainer/client counts for a whole batch of members come from two grouped
// queries (not two per member) — `countsFor` — so a list page costs a constant
// number of round trips regardless of how many members it shows.
async function countsFor(memberIds) {
    const counts = new Map(memberIds.map((id) => [String(id), { trainerCount: 0, clientCount: 0 }]))
    if (!memberIds.length) return counts

    const trainers = await Trainer.find({ managedBy: { $in: memberIds } }, '_id managedBy').lean()
    const memberOfTrainer = new Map()
    for (const t of trainers) {
        memberOfTrainer.set(String(t._id), String(t.managedBy))
        counts.get(String(t.managedBy)).trainerCount += 1
    }
    if (trainers.length) {
        const perTrainer = await Client.aggregate([
            { $match: { trainer: { $in: trainers.map((t) => t._id) } } },
            { $group: { _id: '$trainer', n: { $sum: 1 } } },
        ])
        for (const row of perTrainer) counts.get(memberOfTrainer.get(String(row._id))).clientCount += row.n
    }
    return counts
}

// Subscription status is derived (there is no stored field): no plan -> 'no_plan',
// account not active -> 'inactive', then by planExpiryDate. `subscriptionFilter`
// is the same rule as a Mongo query so the Payments page can filter on it server-side.
const EXPIRING_DAYS = 7
const DAY_MS = 86_400_000

function subscriptionStatus(member, now = new Date()) {
    if (!member.plan) return 'no_plan'
    if (member.status !== 'active') return 'inactive'
    if (!member.planExpiryDate) return 'active'
    const expiry = new Date(member.planExpiryDate)
    if (expiry < now) return 'expired'
    if (expiry <= new Date(now.getTime() + EXPIRING_DAYS * DAY_MS)) return 'expiring'
    return 'active'
}

function subscriptionFilter(status, now = new Date()) {
    const soon = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS)
    const paying = { plan: { $ne: null }, status: 'active' }
    switch (status) {
        case 'no_plan': return { plan: null }
        case 'inactive': return { plan: { $ne: null }, status: { $ne: 'active' } }
        case 'expired': return { ...paying, planExpiryDate: { $lt: now } }
        case 'expiring': return { ...paying, planExpiryDate: { $gte: now, $lte: soon } }
        case 'active': return { ...paying, $or: [{ planExpiryDate: null }, { planExpiryDate: { $gt: soon } }] }
        default: return {}
    }
}

// Purchase-history extras for a batch of members (Payments page): the last
// approved payment's date and how many payments each member has on record.
async function paymentExtrasFor(memberIds) {
    const rows = await MemberPayment.aggregate([
        { $match: { member: { $in: memberIds } } },
        {
            $group: {
                _id: '$member',
                paymentCount: { $sum: 1 },
                purchasedAt: { $max: { $cond: [{ $eq: ['$status', 'approved'] }, '$submittedAt', null] } },
            },
        },
    ])
    return new Map(rows.map((r) => [String(r._id), r]))
}

async function flatten(member, counts, extras) {
    const u = member.user
    const { trainerCount, clientCount } = (counts || (await countsFor([member._id]))).get(String(member._id))
    return {
        id: String(member._id),
        userId: u ? String(u._id) : null,
        name: u?.name,
        email: u?.email,
        avatarColor: u?.avatarColor,
        title: member.title,
        status: member.status,
        trainerCount,
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
        subscriptionStatus: subscriptionStatus(member),
        joinDate: member.joinDate,
        ...(extras ? {
            purchasedAt: extras.get(String(member._id))?.purchasedAt || member.joinDate,
            paymentCount: extras.get(String(member._id))?.paymentCount || 0,
        } : {}),
    }
}

// GET /api/members?status=&search=&subscription=&plan=&include=payments&page=&limit=   (admin only)
// `subscription` = active|expiring|expired|inactive|no_plan, `plan` = SubscriptionPlan id
// (Payments page filters); `include=payments` adds purchasedAt/paymentCount to each row.
// Pagination is opt-in (see utils/pagination.js).
export const listMembers = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status

    if (req.query.plan && req.query.plan !== 'all') filter.plan = req.query.plan
    if (req.query.subscription && req.query.subscription !== 'all') {
        Object.assign(filter, subscriptionFilter(req.query.subscription))
    }

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        filter.user = { $in: await User.find({ role: 'member', $or: [{ name: rx }, { email: rx }] }).distinct('_id') }
    }

    const paging = pageParams(req.query)
    let query = Member.find(filter)
        .populate('user', 'name email avatarColor status')
        .populate('plan')
        .sort({ createdAt: -1, _id: -1 })
        .lean()
    if (paging) query = query.skip(paging.skip).limit(paging.limit)

    const [members, total] = await Promise.all([query, paging ? Member.countDocuments(filter) : null])
    const ids = members.map((m) => m._id)
    const [counts, extras] = await Promise.all([
        countsFor(ids),
        req.query.include === 'payments' ? paymentExtrasFor(ids) : null,
    ])
    const items = await Promise.all(members.map((m) => flatten(m, counts, extras)))

    res.json(paging ? pagedBody(items, total, paging) : { count: items.length, items })
})

// GET /api/members/subscription-summary   (admin only) — headline numbers for the
// Payments page, computed over ALL members / payments (not just the visible page).
export const subscriptionSummary = asyncHandler(async (_req, res) => {
    const now = new Date()
    const [active, expiring, expired, revenue] = await Promise.all([
        Member.countDocuments(subscriptionFilter('active', now)),
        Member.countDocuments(subscriptionFilter('expiring', now)),
        Member.countDocuments(subscriptionFilter('expired', now)),
        MemberPayment.aggregate([
            { $match: { status: 'approved' } },
            { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        ]),
    ])
    res.json({
        active,
        expiring,
        expired,
        totalRevenue: revenue[0]?.total || 0,
        approvedPayments: revenue[0]?.count || 0,
    })
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
// invite flow (temp password emailed through Resend), skipping the self-signup
// onboarding/payment flow entirely (status 'active' immediately).
// `planId` assigns a SubscriptionPlan, snapshotting its trainerLimit/clientLimit
// onto the Member the same way payment-approval does for self-signup members;
// omit it to set `trainerLimit` directly (clientLimit stays 0 — unlimited-clients
// admin/legacy path).
export const createMember = asyncHandler(async (req, res) => {
    const { name, email, title, trainerLimit, planId } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')

    let plan = null
    if (planId) {
        plan = await SubscriptionPlan.findById(planId)
        if (!plan) throw ApiError.badRequest('Select a valid plan')
    }

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
        ...(plan
            ? { plan: plan._id, trainerLimit: plan.maxTrainers, clientLimit: plan.maxClients }
            : { trainerLimit: trainerLimit ?? 5 }),
    })
    await member.populate('user', 'name email avatarColor status')
    await member.populate('plan')
    res.status(201).json({
        ...(await flatten(member)),
        ...(inviteSent ? {} : { inviteWarning, tempPassword }),
    })
})

// PATCH /api/members/:id   (admin only) — Super Admin can raise/lower
// trainerLimit at any time; it never forces existing trainers off the member.
// `planId` reassigns the member's plan, snapshotting its limits (same as create);
// pass `planId: null` to detach the plan and fall back to a manual `trainerLimit`.
export const updateMember = asyncHandler(async (req, res) => {
    const member = await Member.findById(req.params.id).populate('user', 'name email avatarColor status')
    if (!member) throw ApiError.notFound('Member not found')

    if (req.body.title !== undefined) member.title = req.body.title
    if (req.body.status !== undefined) member.status = req.body.status

    if (req.body.planId !== undefined) {
        if (req.body.planId === null) {
            member.plan = null
        } else {
            const plan = await SubscriptionPlan.findById(req.body.planId)
            if (!plan) throw ApiError.badRequest('Select a valid plan')
            member.plan = plan._id
            member.trainerLimit = plan.maxTrainers
            member.clientLimit = plan.maxClients
        }
    }
    if (req.body.trainerLimit !== undefined) {
        if (req.body.trainerLimit < 0) throw ApiError.badRequest('Trainer limit cannot be negative')
        if (req.body.trainerLimit > member.clientLimit) {
            throw ApiError.badRequest(`Trainer limit cannot exceed the client limit (${member.clientLimit})`)
        }
        member.trainerLimit = req.body.trainerLimit
    }
    await member.save()
    await member.populate('plan')

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
