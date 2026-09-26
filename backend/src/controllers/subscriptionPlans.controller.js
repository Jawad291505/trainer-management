import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { SubscriptionPlan } from '../models/index.js'
import { PLAN_AUDIENCES } from '../config/constants.js'

function flatten(plan) {
    return {
        id: String(plan._id),
        name: plan.name,
        audience: plan.audience || 'member',
        priceMonthly: plan.priceMonthly,
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        description: plan.description,
        active: plan.active,
        sortOrder: plan.sortOrder,
    }
}

// GET /api/subscription-plans?audience=member|trainer — Admin sees every plan
// (management page, optionally narrowed by ?audience=); everyone else sees only
// the active plans sold to their own role (Members mid-signup -> member plans,
// self-signup Trainers -> trainer plans). Plans saved before the
// `audience` field existed count as member plans.
export const listPlans = asyncHandler(async (req, res) => {
    const filter = {}
    const audience = req.user.role === 'admin' ? req.query.audience : (req.user.role === 'trainer' ? 'trainer' : 'member')
    if (audience === 'trainer') filter.audience = 'trainer'
    else if (audience === 'member') filter.audience = { $ne: 'trainer' }
    if (req.user.role !== 'admin') filter.active = true
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, priceMonthly: 1 })
    res.json({ count: plans.length, items: plans.map(flatten) })
})

// POST /api/subscription-plans   (admin only)
export const createPlan = asyncHandler(async (req, res) => {
    const { name, priceMonthly, maxClients } = req.body
    const audience = req.body.audience || 'member'
    if (!PLAN_AUDIENCES.includes(audience)) throw ApiError.badRequest('audience must be member or trainer')
    // A trainer plan has no trainer seats — only a client cap.
    const maxTrainers = audience === 'trainer' ? 0 : req.body.maxTrainers
    if (!name || priceMonthly == null || maxClients == null || maxTrainers == null) {
        throw ApiError.badRequest('name, priceMonthly, maxClients and maxTrainers are required')
    }
    if (maxTrainers > maxClients) throw ApiError.badRequest('Trainer capacity cannot exceed client capacity')
    const plan = await SubscriptionPlan.create({
        name,
        audience,
        priceMonthly,
        maxClients,
        maxTrainers,
        currency: req.body.currency || 'PKR',
        description: req.body.description || '',
        active: req.body.active ?? true,
        sortOrder: req.body.sortOrder ?? 0,
    })
    res.status(201).json(flatten(plan))
})

// PATCH /api/subscription-plans/:id   (admin only)
export const updatePlan = asyncHandler(async (req, res) => {
    const plan = await SubscriptionPlan.findById(req.params.id)
    if (!plan) throw ApiError.notFound('Plan not found')

    if (req.body.audience !== undefined && !PLAN_AUDIENCES.includes(req.body.audience)) {
        throw ApiError.badRequest('audience must be member or trainer')
    }
    for (const k of ['name', 'audience', 'priceMonthly', 'currency', 'maxClients', 'maxTrainers', 'description', 'active', 'sortOrder']) {
        if (req.body[k] !== undefined) plan[k] = req.body[k]
    }
    if (plan.audience === 'trainer') plan.maxTrainers = 0
    if (plan.maxTrainers > plan.maxClients) throw ApiError.badRequest('Trainer capacity cannot exceed client capacity')
    await plan.save()
    res.json(flatten(plan))
})

// DELETE /api/subscription-plans/:id   (admin only) — prefer deactivating a
// plan that's already in use; deleting only makes sense for one nobody picked.
export const deletePlan = asyncHandler(async (req, res) => {
    const plan = await SubscriptionPlan.findById(req.params.id)
    if (!plan) throw ApiError.notFound('Plan not found')
    await plan.deleteOne()
    res.json({ ok: true })
})
