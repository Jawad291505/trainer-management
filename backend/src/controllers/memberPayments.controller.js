import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { notifyAdmins, notifyMember, notifyTrainer } from '../services/notify.service.js'
import { User, Member, Trainer, MemberPayment, SubscriptionPlan } from '../models/index.js'
import { planFinalPrice, isFreePlan } from '../models/SubscriptionPlan.js'
import { hasUsedFreePlan, FREE_PLAN_USED_MESSAGE, unusedCredit, planCapacityBlock, addPlanPeriod } from '../services/subscription.service.js'
import { uploadPaymentProof } from '../services/cloudinary.service.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

// Subscription payments come from a Member OR an outsourced Trainer (self-signup
// and renewals share this model / review queue).
const PAYER_USER = { path: 'user', select: 'name email avatarColor' }
const PAYER_POPULATE = [
    { path: 'member', populate: PAYER_USER },
    { path: 'trainer', populate: PAYER_USER },
]

function flatten(payment) {
    const payer = payment.member || payment.trainer
    const u = payer?.user
    return {
        id: String(payment._id),
        payerType: payment.trainer ? 'trainer' : 'member',
        payerId: payer?._id ? String(payer._id) : String(payment.trainer || payment.member),
        payerName: u?.name,
        payerEmail: u?.email,
        payerAvatarColor: u?.avatarColor,
        planId: String(payment.plan),
        planName: payment.planName,
        amount: payment.amount,
        currency: payment.currency,
        maxClients: payment.maxClients,
        maxTrainers: payment.maxTrainers,
        isFree: !!payment.isFree,
        planPrice: payment.planPrice ?? null,
        creditAmount: payment.creditAmount || 0,
        screenshotUrl: payment.screenshotUrl,
        source: payment.source,
        status: payment.status,
        submittedAt: payment.submittedAt,
        reviewedAt: payment.reviewedAt,
        rejectionReason: payment.rejectionReason,
    }
}

const notifyPayer = (payment, payload) => (payment.trainer
    ? notifyTrainer(payment.trainer._id || payment.trainer, payload)
    : notifyMember(payment.member._id || payment.member, payload))

// Point a payer's profile at an approved/renewed plan and switch them on. Members
// snapshot the plan's client + trainer limits; trainers get their client capacity.
async function activatePayer(payment, paidThrough) {
    const common = { status: 'active', plan: payment.plan, pendingPlan: null, planExpiryDate: paidThrough }
    if (payment.trainer) {
        const trainer = await Trainer.findById(payment.trainer)
        Object.assign(trainer, common, { capacity: payment.maxClients })
        if (trainer.onboardingStage) trainer.onboardingStage = 'approved'
        await trainer.save()
        await User.updateOne({ _id: trainer.user }, { status: 'active' })
        return
    }
    const member = await Member.findById(payment.member)
    Object.assign(member, common, { clientLimit: payment.maxClients, trainerLimit: payment.maxTrainers })
    if (member.onboardingStage) member.onboardingStage = 'approved'
    await member.save()
    await User.updateOne({ _id: member.user }, { status: 'active' })
}

// POST /api/member-payments   (member or trainer, pending)   multipart: { screenshot } — planId
// always comes from pendingPlan (set by selectPlan), never the request body,
// so nobody can submit a payment for a plan they never actually chose. A free
// plan needs no screenshot (it is still Admin-approved) but can only be taken once.
export const submitPayment = asyncHandler(async (req, res) => {
    const isTrainer = req.user.role === 'trainer'
    if (!isTrainer && req.user.role !== 'member') throw ApiError.forbidden()
    if (!req.user.emailVerified) throw ApiError.badRequest('Verify your email before submitting a payment')

    const payerKey = isTrainer ? 'trainer' : 'member'
    const payer = isTrainer ? req.trainer : await Member.findOne({ user: req.user._id })
    if (!payer.pendingPlan) throw ApiError.badRequest('Select a plan before submitting a payment')

    const plan = await SubscriptionPlan.findById(payer.pendingPlan)
    if (!plan) throw ApiError.badRequest('Your selected plan is no longer available — please choose another')

    const isFree = isFreePlan(plan)
    if (isFree && await hasUsedFreePlan(payerKey, payer._id)) throw ApiError.badRequest(FREE_PLAN_USED_MESSAGE)
    if (!isFree && !req.file) throw ApiError.badRequest('A payment screenshot is required')

    const { url, publicId } = isFree
        ? { url: '', publicId: '' }
        : await uploadPaymentProof(req.file.buffer, { memberId: payer._id })

    const payment = await MemberPayment.create({
        [payerKey]: payer._id,
        plan: plan._id,
        planName: plan.name,
        amount: planFinalPrice(plan),
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        isFree,
        screenshotUrl: url,
        screenshotPublicId: publicId,
    })

    payer.onboardingStage = 'awaiting_approval'
    await payer.save()
    await notifyAdmins({
        type: 'payment',
        title: 'Payment awaiting approval',
        description: `${req.user.name} (${isTrainer ? 'trainer' : 'member'}) ${isFree ? 'requested the free' : 'submitted payment proof for the'} ${plan.name} plan.`,
    })

    await payment.populate(PAYER_POPULATE)
    res.status(201).json(flatten(payment))
})

// ---- Mid-period plan change (active Member / subscribed Trainer) ----
// The unused part of the current period is credited against the new plan; once
// Admin approves, the new plan applies and a fresh 30-day period starts (activatePayer —
// same path as a first approval). Until then the payer stays on their current plan.

// Who is asking, and are they on a plan they can change from?
function planChanger(req) {
    const payerKey = req.user.role
    if (payerKey !== 'member' && payerKey !== 'trainer') throw ApiError.forbidden()
    const payer = req[payerKey]
    if (!payer?.plan || payer.status !== 'active') throw ApiError.badRequest("You don't have an active subscription to change")
    return { payerKey, payer }
}

// Every active plan sold to this payer, priced for a switch right now.
// `blockedReason` (null = selectable) says why a plan can't be picked.
async function planChangeOptions(payerKey, payer) {
    const [plans, credit, freeUsed] = await Promise.all([
        SubscriptionPlan.find({ active: true, audience: payerKey === 'trainer' ? 'trainer' : { $ne: 'trainer' } })
            .sort({ sortOrder: 1, priceMonthly: 1 }),
        unusedCredit(payerKey, payer),
        hasUsedFreePlan(payerKey, payer._id),
    ])
    const options = await Promise.all(plans.map(async (plan) => {
        const finalPrice = planFinalPrice(plan)
        const isCurrent = String(plan._id) === String(payer.plan)
        let blockedReason = null
        if (isCurrent) blockedReason = 'This is your current plan'
        else if (isFreePlan(plan)) blockedReason = freeUsed ? 'The free plan can only be used once' : "You can't switch to the free plan mid-subscription"
        else blockedReason = await planCapacityBlock(payerKey, payer._id, plan)
        return {
            id: String(plan._id),
            name: plan.name,
            description: plan.description,
            priceMonthly: plan.priceMonthly,
            discountPercent: plan.discountPercent || 0,
            finalPrice,
            currency: plan.currency,
            maxClients: plan.maxClients,
            maxTrainers: plan.maxTrainers,
            isCurrent,
            credit: Math.min(credit, finalPrice),
            amountDue: Math.max(0, finalPrice - credit),
            blockedReason,
        }
    }))
    return { credit, options }
}

const pendingPaymentOf = (payerKey, payerId) => MemberPayment.findOne({ [payerKey]: payerId, status: 'pending' }).populate(PAYER_POPULATE)

// GET /api/plan-change   (member or trainer, active on a plan) — the plans they
// can switch to with today's credit and amount due, plus any request already
// awaiting approval (only one may be open at a time).
export const planChangeQuote = asyncHandler(async (req, res) => {
    const { payerKey, payer } = planChanger(req)
    const [{ credit, options }, pending] = await Promise.all([
        planChangeOptions(payerKey, payer),
        pendingPaymentOf(payerKey, payer._id),
    ])
    res.json({ credit, options, pending: pending ? flatten(pending) : null })
})

// POST /api/plan-change   (member or trainer, active on a plan)   multipart: { planId, screenshot? }
// — the amount is always recomputed here, never taken from the client. A
// screenshot is required unless the credit covers the whole price.
export const requestPlanChange = asyncHandler(async (req, res) => {
    const { payerKey, payer } = planChanger(req)
    if (await MemberPayment.exists({ [payerKey]: payer._id, status: 'pending' })) {
        throw ApiError.badRequest('You already have a request awaiting approval')
    }

    const { options } = await planChangeOptions(payerKey, payer)
    const option = options.find((o) => o.id === String(req.body.planId || ''))
    if (!option) throw ApiError.badRequest('Select a valid plan')
    if (option.blockedReason) throw ApiError.badRequest(option.blockedReason)
    if (option.amountDue > 0 && !req.file) throw ApiError.badRequest('A payment screenshot is required')

    const { url, publicId } = option.amountDue > 0
        ? await uploadPaymentProof(req.file.buffer, { memberId: payer._id })
        : { url: '', publicId: '' }

    const payment = await MemberPayment.create({
        [payerKey]: payer._id,
        plan: option.id,
        planName: option.name,
        amount: option.amountDue,
        planPrice: option.finalPrice,
        creditAmount: option.credit,
        currency: option.currency,
        maxClients: option.maxClients,
        maxTrainers: option.maxTrainers,
        screenshotUrl: url,
        screenshotPublicId: publicId,
        source: 'plan_change',
    })
    await notifyAdmins({
        type: 'payment',
        title: 'Plan change awaiting approval',
        description: `${req.user.name} (${payerKey}) asked to switch to the ${option.name} plan.`,
    })

    await payment.populate(PAYER_POPULATE)
    res.status(201).json(flatten(payment))
})

// GET /api/member-payments/me   (member or trainer) — their own submission history, most recent first.
export const myPayments = asyncHandler(async (req, res) => {
    let filter
    if (req.user.role === 'member') filter = { member: (await Member.findOne({ user: req.user._id }))._id }
    else if (req.user.role === 'trainer') filter = { trainer: req.trainer._id }
    else throw ApiError.forbidden()
    const payments = await MemberPayment.find(filter).populate(PAYER_POPULATE).sort({ createdAt: -1 })
    res.json({ count: payments.length, items: payments.map(flatten) })
})

// GET /api/member-payments?status=&payer=member|trainer&member=&trainer=&search=&page=&limit=   (admin only)
// — review queue for both Member and Trainer subscriptions, optionally scoped to
// one payer (detail pages). `search` matches the payer's name or email.
// Pagination is opt-in (see utils/pagination.js).
export const listMemberPayments = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status
    if (req.query.payer === 'member') filter.member = { $ne: null }
    else if (req.query.payer === 'trainer') filter.trainer = { $ne: null }
    if (req.query.member) filter.member = req.query.member
    if (req.query.trainer) filter.trainer = req.query.trainer

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        const userIds = await User.find({ role: { $in: ['member', 'trainer'] }, $or: [{ name: rx }, { email: rx }] }).distinct('_id')
        const [memberIds, trainerIds] = await Promise.all([
            Member.find({ user: { $in: userIds } }).distinct('_id'),
            Trainer.find({ user: { $in: userIds } }).distinct('_id'),
        ])
        const matchesSearch = { $or: [{ member: { $in: memberIds } }, { trainer: { $in: trainerIds } }] }
        // Keep any explicit payer scoping above and AND the search on top of it.
        filter.$and = [matchesSearch]
    }

    const paging = pageParams(req.query)
    let query = MemberPayment.find(filter)
        .populate(PAYER_POPULATE)
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

    // A plan change was checked against the payer's team size when requested —
    // they may have grown past the new plan's limits since.
    if (payment.source === 'plan_change') {
        const payerKey = payment.trainer ? 'trainer' : 'member'
        const over = await planCapacityBlock(payerKey, payment[payerKey], payment)
        if (over) throw ApiError.badRequest(`This ${payerKey} no longer fits the ${payment.planName} plan — reject the request instead`)
    }

    payment.status = 'approved'
    payment.reviewedAt = new Date()
    payment.reviewedBy = req.user._id
    await payment.save()

    const paidThrough = addPlanPeriod(payment.reviewedAt)
    await activatePayer(payment, paidThrough)
    await notifyPayer(payment, {
        type: 'payment',
        title: 'Payment approved',
        description: `Your ${payment.planName} plan is active until ${paidThrough.toLocaleDateString('en-GB')}.`,
    })

    await payment.populate(PAYER_POPULATE)
    res.json(flatten(payment))
})

// Admin-recorded renewal — no screenshot, auto-approved. Always creates a NEW
// MemberPayment (history is append-only, never overwritten) and then updates the
// payer's current plan/limits/expiry from it. `payerKey` is 'member' | 'trainer'.
async function recordRenewal(req, res, payerKey) {
    const { planId, amount, renewalDate } = req.body
    if (!planId) throw ApiError.badRequest('planId is required')
    if (amount === undefined || amount === null || Number(amount) < 0) throw ApiError.badRequest('A valid amount is required')

    const Model = payerKey === 'trainer' ? Trainer : Member
    const payer = await Model.findById(req.params.id)
    if (!payer) throw ApiError.notFound(payerKey === 'trainer' ? 'Trainer not found' : 'Member not found')

    const plan = await SubscriptionPlan.findById(planId)
    if (!plan) throw ApiError.badRequest('Plan not found')
    if ((plan.audience === 'trainer') !== (payerKey === 'trainer')) {
        throw ApiError.badRequest(`That plan isn't sold to ${payerKey}s`)
    }
    const isFree = isFreePlan(plan)
    if (isFree && await hasUsedFreePlan(payerKey, payer._id)) {
        throw ApiError.badRequest(`This ${payerKey} has already used the free plan — pick a paid plan`)
    }

    const submittedAt = renewalDate ? new Date(renewalDate) : new Date()
    if (Number.isNaN(submittedAt.getTime())) throw ApiError.badRequest('Invalid renewal date')

    const payment = await MemberPayment.create({
        [payerKey]: payer._id,
        plan: plan._id,
        planName: plan.name,
        amount: Number(amount),
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        isFree,
        source: 'admin_renewal',
        status: 'approved',
        submittedAt,
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
    })

    const paidThrough = addPlanPeriod(submittedAt)
    await activatePayer(payment, paidThrough)
    await notifyPayer(payment, {
        type: 'payment',
        title: 'Subscription renewed',
        description: `Your ${plan.name} plan is active until ${paidThrough.toLocaleDateString('en-GB')}.`,
    })

    await payment.populate(PAYER_POPULATE)
    res.status(201).json(flatten(payment))
}

// POST /api/member-payments/:id/renew   (admin only; :id = member id)   Body: { planId, amount, renewalDate? }
export const renewSubscription = asyncHandler((req, res) => recordRenewal(req, res, 'member'))

// POST /api/trainer-payments/:id/renew   (admin only; :id = trainer id)   Body: { planId, amount, renewalDate? }
export const renewTrainerSubscription = asyncHandler((req, res) => recordRenewal(req, res, 'trainer'))

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

    // A rejected plan change leaves an already-active payer exactly where they
    // were; only a signup payment sends them back to resubmit.
    const isPlanChange = payment.source === 'plan_change'
    if (!isPlanChange) {
        if (payment.trainer) await Trainer.updateOne({ _id: payment.trainer }, { onboardingStage: 'rejected' })
        else await Member.updateOne({ _id: payment.member }, { onboardingStage: 'rejected' })
    }
    await notifyPayer(payment, {
        type: 'payment',
        title: isPlanChange ? 'Plan change not approved' : 'Payment not approved',
        description: payment.rejectionReason || (isPlanChange
            ? `Your switch to the ${payment.planName} plan was not approved — your current plan is unchanged.`
            : 'Your payment proof could not be verified. Please submit a new one.'),
    })

    await payment.populate(PAYER_POPULATE)
    res.json(flatten(payment))
})
