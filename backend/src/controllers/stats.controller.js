import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getAdminStats, getMemberStats, getTrainerStats, getClientCompletion, getAdminDashboard, getMemberDashboard,
} from '../services/stats.service.js'
import { Payment } from '../models/index.js'
import { assertClientAccess } from '../utils/clientAccess.js'

// GET /api/stats/admin   (admin) — dashboard + payment headline numbers
export const adminStats = asyncHandler(async (_req, res) => {
    res.json(await getAdminStats())
})

// GET /api/stats/admin/revenue-trend   (admin) — monthly paid revenue for the chart
export const revenueTrend = asyncHandler(async (_req, res) => {
    const rows = await Payment.aggregate([
        { $match: { status: 'paid' } },
        {
            $group: {
                _id: { y: { $year: '$date' }, m: { $month: '$date' } },
                revenue: { $sum: '$amount' },
            },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
    ])
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    res.json({
        items: rows.map((r) => ({ month: MONTHS[r._id.m - 1], year: r._id.y, revenue: r.revenue })),
    })
})

// GET /api/stats/member   (member) — dashboard cards scoped to the member's own trainers/clients
export const memberStats = asyncHandler(async (req, res) => {
    res.json(await getMemberStats(req.member._id))
})

// GET /api/stats/admin/dashboard   (admin) — the Members business: subscriptions, revenue, growth
export const adminDashboard = asyncHandler(async (_req, res) => {
    res.json(await getAdminDashboard())
})

// GET /api/stats/member/dashboard   (member) — the member's own trainers: workload, ratings, requests
export const memberDashboard = asyncHandler(async (req, res) => {
    res.json(await getMemberDashboard(req.member._id))
})

// GET /api/stats/trainer   (trainer) — trainer dashboard cards
export const trainerStats = asyncHandler(async (req, res) => {
    res.json(await getTrainerStats(req.trainer._id))
})

// GET /api/stats/client/completion?days=7   (client, or trainer/admin via ?client=)
export const clientCompletion = asyncHandler(async (req, res) => {
    const client = await assertClientAccess(req, req.query.client)
    const clientId = client._id
    const days = Number(req.query.days) || 7
    res.json(await getClientCompletion(clientId, days))
})
