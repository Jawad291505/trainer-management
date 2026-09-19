import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { DietPlan, GroceryList, Client } from '../models/index.js'
import { computeGroceryList } from '../services/groceryList.service.js'
import { pktStartOfDay } from '../utils/pktTime.js'

// Same access rule as getClientDietPlan (dietPlans.controller.js): a client
// only sees their own list, a trainer only their own client's, admin unrestricted.
async function resolveClientAccess(req) {
    const clientId = req.params.clientId === 'me' ? req.client?._id : req.params.clientId
    if (!clientId) throw ApiError.badRequest('Unknown client')
    if (req.user.role === 'client' && String(clientId) !== String(req.client._id)) throw ApiError.forbidden()
    if (req.user.role === 'trainer') {
        const client = await Client.findById(clientId)
        if (!client) throw ApiError.notFound('Client not found')
        if (String(client.trainer) !== String(req.trainer._id)) {
            throw ApiError.forbidden('That client is not assigned to you')
        }
    }
    return clientId
}

async function loadPublishedPlanOr404(clientId) {
    const plan = await DietPlan.findOne({ client: clientId, status: 'published' }).sort({ publishedAt: -1 })
    if (!plan) throw ApiError.notFound('No diet plan for this client yet')
    return plan
}

async function getOrCreateAnchor(clientId, trainerId) {
    let anchor = await GroceryList.findOne({ client: clientId })
    if (!anchor) {
        anchor = await GroceryList.create({
            client: clientId,
            trainer: trainerId,
            windowStart: pktStartOfDay(),
            refreshedAt: new Date(),
        })
    }
    return anchor
}

// GET /api/clients/:clientId/grocery-list
export const getGroceryList = asyncHandler(async (req, res) => {
    const clientId = await resolveClientAccess(req)
    const plan = await loadPublishedPlanOr404(clientId)
    const anchor = await getOrCreateAnchor(clientId, plan.trainer)

    const { windowStart, windowEnd, groups } = await computeGroceryList(plan, anchor.windowStart)
    res.json({ windowStart, windowEnd, refreshedAt: anchor.refreshedAt, groups })
})

// POST /api/clients/:clientId/grocery-list/refresh
// Anchors a fresh 7-day window at "now" and stamps refreshedAt.
export const refreshGroceryList = asyncHandler(async (req, res) => {
    const clientId = await resolveClientAccess(req)
    const plan = await loadPublishedPlanOr404(clientId)

    const now = new Date()
    const anchor = await GroceryList.findOneAndUpdate(
        { client: clientId },
        { client: clientId, trainer: plan.trainer, windowStart: pktStartOfDay(now), refreshedAt: now },
        { upsert: true, new: true },
    )

    const { windowStart, windowEnd, groups } = await computeGroceryList(plan, anchor.windowStart)
    res.json({ windowStart, windowEnd, refreshedAt: anchor.refreshedAt, groups })
})
