import {
    Trainer,
    Client,
    User,
    Member,
    Payment,
    FollowUp,
    DailyLog,
} from '../models/index.js'
import { bucketFor } from './followUp.service.js'
import { pktStartOfDay } from '../utils/pktTime.js'

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
