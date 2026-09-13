import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { SubscriptionPlan } from '../models/index.js'

function flatten(plan) {
    return {
        id: String(plan._id),
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        currency: plan.currency,
        maxClients: plan.maxClients,
        maxTrainers: plan.maxTrainers,
        description: plan.description,
        active: plan.active,
        sortOrder: plan.sortOrder,
    }
}

// GET /api/subscription-plans — Admin sees every plan (management page);
// everyone else (Members mid-signup) sees only the active, sellable ones.
export const listPlans = asyncHandler(async (req, res) => {
    const filter = req.user.role === 'admin' ? {} : { active: true }
    const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, priceMonthly: 1 })
    res.json({ count: plans.length, items: plans.map(flatten) })
})

// POST /api/subscription-plans   (admin only)
export const createPlan = asyncHandler(async (req, res) => {
    const { name, priceMonthly, maxClients, maxTrainers } = req.body
    if (!name || priceMonthly == null || maxClients == null || maxTrainers == null) {
        throw ApiError.badRequest('name, priceMonthly, maxClients and maxTrainers are required')
    }
    if (maxTrainers > maxClients) throw ApiError.badRequest('Trainer capacity cannot exceed client capacity')
    const plan = await SubscriptionPlan.create({
        name,
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

    for (const k of ['name', 'priceMonthly', 'currency', 'maxClients', 'maxTrainers', 'description', 'active', 'sortOrder']) {
        if (req.body[k] !== undefined) plan[k] = req.body[k]
    }
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
