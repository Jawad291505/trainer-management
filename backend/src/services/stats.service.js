import {
    Trainer,
    Client,
    User,
    Member,
    MemberPayment,
    Payment,
    FollowUp,
    DailyLog,
    Review,
    CorrectionRequest,
} from '../models/index.js'
import { bucketFor } from './followUp.service.js'
import { pktStartOfDay } from '../utils/pktTime.js'
import { subscriptionStatus, DAY_MS } from './subscription.service.js'

// ---- Admin dashboard + payments stats ----
// Ports admin/src/services/mockData.js `getStats()`.
export async function getAdminStats() {
    const [
        totalClients,
        activeClients,
        totalTrainers,
        activeTrainers,
        trainerAgg,
        paymentAgg,
        clientsPerTrainer,
    ] = await Promise.all([
        Client.countDocuments({}),
        Client.countDocuments({ status: 'active' }),
        Trainer.countDocuments({}),
        Trainer.countDocuments({ status: 'active' }),
        Trainer.aggregate([
            { $group: { _id: null, capacity: { $sum: '$capacity' }, used: { $sum: '$clientCount' } } },
        ]),
        // Per-status count + total in one aggregate instead of loading every Payment doc.
        Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
        Client.aggregate([
            { $match: { trainer: { $ne: null } } },
            { $group: { _id: '$trainer', value: { $sum: 1 } } },
        ]),
    ])

    const totalCapacity = trainerAgg[0]?.capacity || 0
    const usedCapacity = trainerAgg[0]?.used || 0

    const statusRow = (st) => paymentAgg.find((r) => r._id === st) || { count: 0, total: 0 }
    const paid = statusRow('paid')
    const pending = statusRow('pending')
    const failed = statusRow('failed')
    const refunded = statusRow('refunded')

    // Resolve trainer names for the client-distribution donut.
    const trainers = await Trainer.find({}, 'user').populate('user', 'name')
    const nameById = new Map(trainers.map((t) => [String(t._id), t.user?.name?.split(' ')[0] || 'Trainer']))

    // Monthly client growth (last 8 months) — counts clients by joinDate month.
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const eightMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 7, 1)
    const clientGrowthAgg = await Client.aggregate([
        { $match: { joinDate: { $gte: eightMonthsAgo } } },
        { $group: { _id: { y: { $year: '$joinDate' }, m: { $month: '$joinDate' } }, clients: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
    ])
    const trainerGrowthAgg = await User.aggregate([
        { $match: { role: 'trainer', joinDate: { $gte: eightMonthsAgo } } },
        { $group: { _id: { y: { $year: '$joinDate' }, m: { $month: '$joinDate' } }, trainers: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
    ])
    // Build a filled array for all 8 months
    const clientGrowth = []
    for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth() + 1
        const cRow = clientGrowthAgg.find((r) => r._id.y === y && r._id.m === m)
        const tRow = trainerGrowthAgg.find((r) => r._id.y === y && r._id.m === m)
        clientGrowth.push({ month: MONTHS[m - 1], clients: cRow?.clients || 0, trainers: tRow?.trainers || 0 })
    }

    return {
        totalClients,
        activeClients,
        totalTrainers,
        activeTrainers,
        totalCapacity,
        usedCapacity,
        availableCapacity: totalCapacity - usedCapacity,

        totalRevenue: paid.total,
        pendingAmount: pending.total,
        paidCount: paid.count,
        pendingCount: pending.count,
        failedCount: failed.count,
        refundedCount: refunded.count,

        paymentStatusData: [
            { key: 'paid', name: 'Paid', value: paid.count },
            { key: 'pending', name: 'Pending', value: pending.count },
            { key: 'failed', name: 'Failed', value: failed.count },
            { key: 'refunded', name: 'Refunded', value: refunded.count },
        ],
        clientDistribution: clientsPerTrainer.map((row) => ({
            name: nameById.get(String(row._id)) || 'Trainer',
            value: row.value,
        })),
        clientGrowth,
    }
}

// ---- Member dashboard stats ----
// Same shape as admin dashboard cards, scoped to the member's own trainers/clients,
// with no revenue/payment figures (Payments & Sales stay Admin-only).
export async function getMemberStats(memberId) {
    const [member, trainers] = await Promise.all([
        Member.findById(memberId, 'trainerLimit clientLimit'),
        Trainer.find({ managedBy: memberId }),
    ])
    const trainerIds = trainers.map((t) => t._id)

    const [totalClients, activeClients] = await Promise.all([
        Client.countDocuments({ trainer: { $in: trainerIds } }),
        Client.countDocuments({ trainer: { $in: trainerIds }, status: 'active' }),
    ])

    const totalCapacity = trainers.reduce((s, t) => s + (t.capacity || 0), 0)
    const usedCapacity = trainers.reduce((s, t) => s + (t.clientCount || 0), 0)

    return {
        totalTrainers: trainers.length,
        trainerLimit: member?.trainerLimit ?? 0,
        activeTrainers: trainers.filter((t) => t.status === 'active').length,
        totalClients,
        clientLimit: member?.clientLimit ?? 0,
        activeClients,
        totalCapacity,
        usedCapacity,
        availableCapacity: totalCapacity - usedCapacity,
    }
}

// ---- Dashboard helpers ----
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_SHOWN = 8

// The last `n` calendar months, oldest first: [{ y, m, month: 'Jan' }].
function lastMonths(n = MONTHS_SHOWN, now = new Date()) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1)
        return { y: d.getFullYear(), m: d.getMonth() + 1, month: MONTH_NAMES[d.getMonth()] }
    })
}

const monthsStart = (n, now) => new Date(now.getFullYear(), now.getMonth() - (n - 1), 1)
const monthGroup = (field) => ({ y: { $year: field }, m: { $month: field } })

// Spread a grouped aggregate ({ _id: { y, m }, n }) over every month of the window
// (0 where a month had no rows) as [{ month, [key]: n }].
const fillMonths = (months, rows, key) =>
    months.map(({ y, m, month }) => ({ month, [key]: rows.find((r) => r._id.y === y && r._id.m === m)?.n || 0 }))

const firstName = (name) => name?.split(' ')[0] || 'Unknown'

// ---- Super Admin dashboard: the Members business ----
// Members are the Super Admin's customers — they subscribe to a SubscriptionPlan,
// pay through MemberPayment, and run their own Trainers/Clients. Everything here
// is computed live from Member / MemberPayment / Trainer; nothing is stored.
export async function getAdminDashboard() {
    const now = new Date()
    const months = lastMonths(MONTHS_SHOWN, now)
    const since = monthsStart(MONTHS_SHOWN, now)

    const [members, teams, paymentAgg, revenueAgg, totalTrainers, totalClients] = await Promise.all([
        Member.find({}, 'user plan status planExpiryDate trainerLimit clientLimit joinDate')
            .populate('user', 'name email avatarColor')
            .populate('plan', 'name priceMonthly currency')
            .lean(),
        // Trainers grouped by the member who manages them (denormalised clientCount, as in getMemberStats).
        Trainer.aggregate([
            { $match: { managedBy: { $ne: null } } },
            { $group: { _id: '$managedBy', trainers: { $sum: 1 }, clients: { $sum: '$clientCount' } } },
        ]),
        MemberPayment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
        MemberPayment.aggregate([
            { $match: { status: 'approved', submittedAt: { $gte: since } } },
            { $group: { _id: monthGroup('$submittedAt'), n: { $sum: '$amount' } } },
        ]),
        Trainer.countDocuments({}),
        Client.countDocuments({}),
    ])

    const teamOf = new Map(teams.map((t) => [String(t._id), t]))
    const rows = members.map((mb) => {
        const team = teamOf.get(String(mb._id))
        return {
            id: String(mb._id),
            name: mb.user?.name,
            email: mb.user?.email,
            avatarColor: mb.user?.avatarColor,
            memberStatus: mb.status,
            plan: mb.plan?.name || null,
            planExpiryDate: mb.planExpiryDate,
            daysLeft: mb.planExpiryDate ? Math.ceil((new Date(mb.planExpiryDate) - now) / DAY_MS) : null,
            subscriptionStatus: subscriptionStatus(mb, now),
            trainerCount: team?.trainers || 0,
            trainerLimit: mb.trainerLimit,
            clientCount: team?.clients || 0,
            clientLimit: mb.clientLimit,
            joinDate: mb.joinDate,
        }
    })

    const subscriptions = { active: 0, expiring: 0, expired: 0, inactive: 0, no_plan: 0 }
    for (const r of rows) subscriptions[r.subscriptionStatus] += 1

    const payment = (status) => paymentAgg.find((r) => r._id === status) || { count: 0, total: 0 }
    const approved = payment('approved')
    const pending = payment('pending')

    // Monthly recurring revenue: what members currently paying (or about to renew) are worth.
    const mrr = members.reduce((sum, mb, i) => {
        const live = rows[i].subscriptionStatus === 'active' || rows[i].subscriptionStatus === 'expiring'
        return live ? sum + (mb.plan?.priceMonthly || 0) : sum
    }, 0)

    const thisMonth = months[months.length - 1]
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)
    const planCounts = new Map()
    for (const r of rows) planCounts.set(r.plan || 'No plan', (planCounts.get(r.plan || 'No plan') || 0) + 1)

    const SUB_LABELS = { active: 'Active', expiring: 'Expiring soon', expired: 'Expired', inactive: 'Inactive', no_plan: 'No plan' }

    return {
        currency: members.find((mb) => mb.plan?.currency)?.plan.currency || 'PKR',

        totalMembers: rows.length,
        activeMembers: rows.filter((r) => r.memberStatus === 'active').length,
        pendingSignups: rows.filter((r) => r.memberStatus === 'pending').length,
        newMembers30d: rows.filter((r) => r.joinDate && new Date(r.joinDate) >= thirtyDaysAgo).length,
        subscriptions,

        totalRevenue: approved.total,
        approvedPayments: approved.count,
        revenueThisMonth: revenueAgg.find((r) => r._id.y === thisMonth.y && r._id.m === thisMonth.m)?.n || 0,
        monthlyRecurring: mrr,
        pendingApprovals: pending.count,
        pendingAmount: pending.total,

        // Footprint of the whole platform, for context next to the member numbers.
        totalTrainers,
        totalClients,

        memberGrowth: fillMonths(months, await Member.aggregate([
            { $match: { joinDate: { $gte: since } } },
            { $group: { _id: monthGroup('$joinDate'), n: { $sum: 1 } } },
        ]), 'members'),
        revenueTrend: fillMonths(months, revenueAgg, 'revenue'),
        subscriptionData: Object.entries(subscriptions).map(([key, value]) => ({ key, name: SUB_LABELS[key], value })).filter((d) => d.value > 0),
        planDistribution: [...planCounts.entries()].map(([name, value]) => ({ name, value })),

        // Members whose plan has lapsed or lapses within a week, soonest first.
        needsAttention: rows
            .filter((r) => r.subscriptionStatus === 'expiring' || r.subscriptionStatus === 'expired')
            .sort((a, b) => new Date(a.planExpiryDate) - new Date(b.planExpiryDate))
            .slice(0, 6),
        recentMembers: [...rows].sort((a, b) => new Date(b.joinDate) - new Date(a.joinDate)).slice(0, 6),
    }
}

// ---- Member dashboard: the member's own Trainers ----
// Scoped to Trainer.managedBy === member. Unlike getMemberStats (which the Clients /
// Trainers pages use for their limit banners), this powers the dashboard itself:
// per-trainer workload, ratings and requests, plus growth and recent reviews.
export async function getMemberDashboard(memberId) {
    const now = new Date()
    const months = lastMonths(MONTHS_SHOWN, now)
    const since = monthsStart(MONTHS_SHOWN, now)

    const [member, trainers] = await Promise.all([
        Member.findById(memberId, 'trainerLimit clientLimit plan planExpiryDate status')
            .populate('plan', 'name maxClients maxTrainers currency')
            .lean(),
        Trainer.find({ managedBy: memberId }).populate('user', 'name email avatarColor').lean(),
    ])
    const trainerIds = trainers.map((t) => t._id)
    const inScope = { $in: trainerIds }

    const [clientAgg, growthAgg, reviewAgg, openAgg, recentReviews] = await Promise.all([
        Client.aggregate([
            { $match: { trainer: inScope } },
            {
                $group: {
                    _id: '$trainer',
                    clients: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                    avgProgress: { $avg: '$progress' },
                },
            },
        ]),
        Client.aggregate([
            { $match: { trainer: inScope, joinDate: { $gte: since } } },
            { $group: { _id: monthGroup('$joinDate'), n: { $sum: 1 } } },
        ]),
        Review.aggregate([{ $match: { trainer: inScope } }, { $group: { _id: '$trainer', count: { $sum: 1 }, avg: { $avg: '$rating' } } }]),
        CorrectionRequest.aggregate([{ $match: { trainer: inScope, status: 'open' } }, { $group: { _id: '$trainer', n: { $sum: 1 } } }]),
        Review.find({ trainer: inScope })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
            .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
            .lean(),
    ])

    const byTrainer = (rows) => new Map(rows.map((r) => [String(r._id), r]))
    const clientsOf = byTrainer(clientAgg)
    const reviewsOf = byTrainer(reviewAgg)
    const openOf = byTrainer(openAgg)

    const rows = trainers.map((t) => {
        const c = clientsOf.get(String(t._id))
        return {
            id: String(t._id),
            name: t.user?.name,
            email: t.user?.email,
            avatarColor: t.user?.avatarColor,
            specialization: t.specialization,
            status: t.status,
            clients: c?.clients || 0,
            activeClients: c?.active || 0,
            capacity: t.capacity,
            avgProgress: Math.round(c?.avgProgress || 0),
            rating: t.rating,
            reviewCount: reviewsOf.get(String(t._id))?.count || 0,
            openRequests: openOf.get(String(t._id))?.n || 0,
        }
    })

    const sum = (key) => rows.reduce((s, r) => s + r[key], 0)
    const totalReviews = reviewAgg.reduce((s, r) => s + r.count, 0)
    const totalCapacity = sum('capacity')
    const totalClients = sum('clients')

    return {
        subscription: member && {
            plan: member.plan?.name || null,
            planExpiryDate: member.planExpiryDate,
            daysLeft: member.planExpiryDate ? Math.ceil((new Date(member.planExpiryDate) - now) / DAY_MS) : null,
            status: subscriptionStatus(member, now),
        },

        totalTrainers: rows.length,
        trainerLimit: member?.trainerLimit ?? 0,
        activeTrainers: rows.filter((r) => r.status === 'active').length,
        totalClients,
        clientLimit: member?.clientLimit ?? 0,
        activeClients: sum('activeClients'),
        totalCapacity,
        usedCapacity: totalClients,
        availableCapacity: Math.max(0, totalCapacity - totalClients),
        // Review-weighted, so a trainer with many reviews counts for more than one with a single review.
        averageRating: totalReviews ? Math.round((reviewAgg.reduce((s, r) => s + r.avg * r.count, 0) / totalReviews) * 10) / 10 : 0,
        totalReviews,
        openRequests: sum('openRequests'),

        trainers: rows,
        clientDistribution: rows.filter((r) => r.clients > 0).map((r) => ({ name: firstName(r.name), value: r.clients })),
        clientGrowth: fillMonths(months, growthAgg, 'clients'),
        recentReviews: recentReviews.map((r) => ({
            id: String(r._id),
            clientName: r.client?.user?.name,
            clientAvatarColor: r.client?.user?.avatarColor,
            trainerName: r.trainer?.user?.name,
            rating: r.rating,
            comment: r.comment,
            updatedAt: r.updatedAt,
        })),
    }
}

// ---- Trainer dashboard stats ----
// Ports trainer/src/services/mockData.js `getStats()`.
export async function getTrainerStats(trainerId) {
    const [total, active, attention, followUps] = await Promise.all([
        Client.countDocuments({ trainer: trainerId }),
        Client.countDocuments({ trainer: trainerId, status: 'active' }),
        Client.countDocuments({ trainer: trainerId, status: 'active', progress: { $lt: 45 } }),
        FollowUp.find({ trainer: trainerId }, 'date status completedAt').lean(),
    ])

    // Buckets are derived from date + status (the stored value goes stale).
    const buckets = followUps.map(bucketFor)
    const pendingFollowUps = buckets.filter((b) => b === 'overdue' || b === 'today').length
    const completedFollowUps = buckets.filter((b) => b === 'completed').length

    return { total, active, attention, pendingFollowUps, completedFollowUps }
}

// ---- Client compliance / weekly completion ----
// Ports user MyProgress: weeklyCompletion[] + complianceData[] + getTodayProgress.
export async function getClientCompletion(clientId, days = 7) {
    // DailyLog.date is a PKT day bucket, so the window must be PKT-aligned too.
    const since = new Date(pktStartOfDay().getTime() - (days - 1) * 24 * 60 * 60 * 1000)

    const logs = await DailyLog.find({ client: clientId, date: { $gte: since } }).sort({ date: 1 })

    const weekly = logs.map((log) => ({
        date: log.date,
        pct: log.completionPct,
    }))

    // Compliance grouped by task type across the window.
    const byType = {}
    for (const log of logs) {
        for (const t of log.tasks) {
            byType[t.type] ??= { done: 0, total: 0 }
            byType[t.type].total += 1
            if (t.done) byType[t.type].done += 1
        }
    }
    const compliance = Object.entries(byType).map(([name, v]) => ({
        name,
        value: v.total ? Math.round((v.done / v.total) * 100) : 0,
    }))

    const avg = weekly.length
        ? Math.round(weekly.reduce((s, d) => s + d.pct, 0) / weekly.length)
        : 0

    return { weeklyCompletion: weekly, compliance, weeklyAveragePct: avg }
}
