import { asyncHandler } from '../utils/asyncHandler.js'
import { User, Trainer, MemberPayment } from '../models/index.js'
import { subscriptionStatus, subscriptionFilter } from '../services/subscription.service.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'
import { paymentExtrasFor } from './members.controller.js'

// Only independent (outsourced) trainers pay for a plan, so they are the ones
// on the Payments page's Trainers view. Same row shape as the Members view so
// the one table renders both.
const SUBSCRIBED = { affiliation: 'outsourced' }

function flatten(trainer, extras) {
    const u = trainer.user
    const plan = trainer.plan && typeof trainer.plan === 'object' ? trainer.plan : null
    const extra = extras.get(String(trainer._id))
    return {
        id: String(trainer._id),
        userId: u ? String(u._id) : null,
        name: u?.name,
        email: u?.email,
        avatarColor: u?.avatarColor,
        status: trainer.status,
        onboardingStage: trainer.onboardingStage || null,
        plan: plan ? {
            id: String(plan._id),
            name: plan.name,
            priceMonthly: plan.priceMonthly,
            currency: plan.currency,
            maxClients: plan.maxClients,
        } : null,
        planExpiryDate: trainer.planExpiryDate,
        subscriptionStatus: subscriptionStatus(trainer),
        joinDate: trainer.joinDate,
        purchasedAt: extra?.purchasedAt || trainer.joinDate,
        paymentCount: extra?.paymentCount || 0,
    }
}

// GET /api/trainers/subscriptions?subscription=&plan=&search=&page=&limit=   (admin only)
// `subscription` = active|expiring|expired|inactive|no_plan, `plan` = SubscriptionPlan id.
// Search, filters and paging all run here — the Payments page sends them as query params.
export const listTrainerSubscriptions = asyncHandler(async (req, res) => {
    const filter = { ...SUBSCRIBED }
    if (req.query.plan && req.query.plan !== 'all') filter.plan = req.query.plan
    if (req.query.subscription && req.query.subscription !== 'all') {
        Object.assign(filter, subscriptionFilter(req.query.subscription))
    }

    const search = String(req.query.search || '').trim()
    if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        filter.user = { $in: await User.find({ role: 'trainer', $or: [{ name: rx }, { email: rx }] }).distinct('_id') }
    }

    const paging = pageParams(req.query)
    let query = Trainer.find(filter)
        .populate('user', 'name email avatarColor status')
        .populate('plan')
        .sort({ createdAt: -1, _id: -1 })
        .lean()
    if (paging) query = query.skip(paging.skip).limit(paging.limit)

    const [trainers, total] = await Promise.all([query, paging ? Trainer.countDocuments(filter) : null])
    const extras = await paymentExtrasFor(trainers.map((t) => t._id), 'trainer')
    const items = trainers.map((t) => flatten(t, extras))

    res.json(paging ? pagedBody(items, total, paging) : { count: items.length, items })
})

// GET /api/trainers/subscription-summary   (admin only) — headline numbers for the
// Payments page's Trainers view, over ALL independent trainers / trainer payments.
export const trainerSubscriptionSummary = asyncHandler(async (_req, res) => {
    const now = new Date()
    const [active, expiring, expired, revenue] = await Promise.all([
        Trainer.countDocuments({ ...SUBSCRIBED, ...subscriptionFilter('active', now) }),
        Trainer.countDocuments({ ...SUBSCRIBED, ...subscriptionFilter('expiring', now) }),
        Trainer.countDocuments({ ...SUBSCRIBED, ...subscriptionFilter('expired', now) }),
        MemberPayment.aggregate([
            { $match: { status: 'approved', trainer: { $ne: null } } },
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
