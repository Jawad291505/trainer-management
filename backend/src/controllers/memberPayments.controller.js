import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, MemberPayment, SubscriptionPlan } from '../models/index.js'
import { uploadPaymentProof } from '../services/cloudinary.service.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

function flatten(payment) {
    const m = payment.member
    const u = m?.user
    return {
        id: String(payment._id),
        memberId: m ? String(m._id) : String(payment.member),
        memberName: u?.name,
        memberEmail: u?.email,
        memberAvatarColor: u?.avatarColor,
        planId: String(payment.plan),
        planName: payment.planName,
        amount: payment.amount,
        currency: payment.currency,
        maxClients: payment.maxClients,
        maxTrainers: payment.maxTrainers,
        screenshotUrl: payment.screenshotUrl,
        source: payment.source,
        status: payment.status,
        submittedAt: payment.submittedAt,
        reviewedAt: payment.reviewedAt,
        rejectionReason: payment.rejectionReason,
    }
}

// A monthly plan's coverage period from a given start date — used to set
// Member.planExpiryDate on both first approval and every later renewal.
function addOneMonth(date) {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 1)
    return d
}

// POST /api/member-payments   (member, pending)   multipart: { screenshot } — planId
// always comes from Member.pendingPlan (set by selectPlan), never the request body,
// so a member can't submit a payment for a plan they never actually chose.
export const submitPayment = asyncHandler(async (req, res) => {
    if (req.user.role !== 'member') throw ApiError.forbidden()
    if (!req.user.emailVerified) throw ApiError.badRequest('Verify your email before submitting a payment')
    if (!req.file) throw ApiError.badRequest('A payment screenshot is required')

    const member = await Member.findOne({ user: req.user._id })
    if (!member.pendingPlan) throw ApiError.badRequest('Select a plan before submitting a payment')

    const plan = await SubscriptionPlan.findById(member.pendingPlan)
    if (!plan) throw ApiError.badRequest('Your selected plan is no longer available — please choose another')

    const { url, publicId } = await uploadPaymentProof(req.file.buffer, { memberId: member._id })

    const payment = await MemberPayment.create({
        member: member._id,
        plan: plan._id,
        planName: plan.name,
        amount: plan.priceMonthly,
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        screenshotUrl: url,
        screenshotPublicId: publicId,
    })

    member.onboardingStage = 'awaiting_approval'
    await member.save()

    await payment.populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
    res.status(201).json(flatten(payment))
})

// GET /api/member-payments/me   (member) — their own submission history, most recent first.
export const myPayments = asyncHandler(async (req, res) => {
    if (req.user.role !== 'member') throw ApiError.forbidden()
    const member = await Member.findOne({ user: req.user._id })
    const payments = await MemberPayment.find({ member: member._id })
        .populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
        .sort({ createdAt: -1 })
    res.json({ count: payments.length, items: payments.map(flatten) })
})

// GET /api/member-payments?status=&member=&search=&page=&limit=   (admin only) — review queue,
// optionally scoped to one member (Member Management detail page). `search` matches the
// member's name or email. Pagination is opt-in (see utils/pagination.js).
export const listMemberPayments = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status
    if (req.query.member) filter.member = req.query.member

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        const userIds = await User.find({ role: 'member', $or: [{ name: rx }, { email: rx }] }).distinct('_id')
        const memberIds = await Member.find({ user: { $in: userIds } }).distinct('_id')
        filter.member = req.query.member
            ? { $in: memberIds.filter((id) => String(id) === req.query.member) }
            : { $in: memberIds }
    }

    const paging = pageParams(req.query)
    let query = MemberPayment.find(filter)
        .populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
        .sort({ createdAt: -1, _id: -1 })
    if (paging) query = query.skip(paging.skip).limit(paging.limit)

    const [payments, total] = await Promise.all([query, paging ? MemberPayment.countDocuments(filter) : null])
    const items = payments.map(flatten)
    res.json(paging ? pagedBody(items, total, paging) : { count: items.length, items })
})

// PATCH /api/member-payments/:id/approve   (admin only)
export const approveMemberPayment = asyncHandler(async (req, res) => {
    const payment = await MemberPayment.findById(req.params.id)
    if (!payment) throw ApiError.notFound('Payment not found')
    if (payment.status !== 'pending') throw ApiError.badRequest('This payment has already been reviewed')

    payment.status = 'approved'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.user._id
    await payment.save()

    const member = await Member.findById(payment.member)
    member.status = 'active'
    member.plan = payment.plan
    member.pendingPlan = null
    member.clientLimit = payment.maxClients
    member.trainerLimit = payment.maxTrainers
    member.planExpiryDate = addOneMonth(payment.submittedAt)
    member.onboardingStage = 'approved'
    await member.save()
    await User.updateOne({ _id: member.user }, { status: 'active' })

    await payment.populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
    res.json(flatten(payment))
})

// POST /api/member-payments/:memberId/renew   (admin only)   Body: { planId, amount, renewalDate? }
// Admin-recorded renewal for an existing member — no screenshot, auto-approved.
// Always creates a NEW MemberPayment (history is append-only, never overwritten)
// and then updates the Member's current plan/limit/expiry from it.
export const renewSubscription = asyncHandler(async (req, res) => {
    const { planId, amount, renewalDate } = req.body
    if (!planId) throw ApiError.badRequest('planId is required')
    if (amount === undefined || amount === null || Number(amount) < 0) throw ApiError.badRequest('A valid amount is required')

    const member = await Member.findById(req.params.memberId)
    if (!member) throw ApiError.notFound('Member not found')

    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) throw ApiError.badRequest('Plan not found')

    const submittedAt = renewalDate ? new Date(renewalDate) : new Date()
    if (Number.isNaN(submittedAt.getTime())) throw ApiError.badRequest('Invalid renewal date')

    const payment = await MemberPayment.create({
        member: member._id,
        plan: plan._id,
        planName: plan.name,
        amount: Number(amount),
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        source: 'admin_renewal',
        status: 'approved',
        submittedAt,
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
    })

    member.status = 'active'
    member.plan = plan._id
    member.pendingPlan = null
    member.clientLimit = plan.maxClients
    member.trainerLimit = plan.maxTrainers
    member.planExpiryDate = addOneMonth(submittedAt)
    if (member.onboardingStage) member.onboardingStage = 'approved'
    await member.save()
    await User.updateOne({ _id: member.user }, { status: 'active' })

    await payment.populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
    res.status(201).json(flatten(payment))
})

// PATCH /api/member-payments/:id/reject   (admin only)   Body: { reason? }
export const rejectMemberPayment = asyncHandler(async (req, res) => {
    const payment = await MemberPayment.findById(req.params.id)
    if (!payment) throw ApiError.notFound('Payment not found')
    if (payment.status !== 'pending') throw ApiError.badRequest('This payment has already been reviewed')

    payment.status = 'rejected'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.user._id
    payment.rejectionReason = req.body.reason || ''
    await payment.save()

    await Member.updateOne({ _id: payment.member }, { onboardingStage: 'rejected' })

    await payment.populate({ path: 'member', populate: { path: 'user', select: 'name email avatarColor' } })
    res.json(flatten(payment))
})
