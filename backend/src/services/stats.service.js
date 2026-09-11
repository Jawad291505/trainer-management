import {
    Trainer,
    Client,
    User,
    Payment,
    FollowUp,
    DailyLog,
} from '../models/index.js'

// ---- Admin dashboard + payments stats ----
// Ports admin/src/services/mockData.js `getStats()`.
export async function getAdminStats() {
    const [
        totalClients,
        activeClients,
        totalTrainers,
        activeTrainers,
        trainerAgg,
        payments,
        clientsPerTrainer,
    ] = await Promise.all([
        Client.countDocuments({}),
        Client.countDocuments({ status: 'active' }),
        Trainer.countDocuments({}),
        Trainer.countDocuments({ status: 'active' }),
        Trainer.aggregate([
            { $group: { _id: null, capacity: { $sum: '$capacity' }, used: { $sum: '$clientCount' } } },
        ]),
        Payment.find({}, 'amount status'),
        Client.aggregate([
            { $match: { trainer: { $ne: null } } },
            { $group: { _id: '$trainer', value: { $sum: 1 } } },
        ]),
    ])

    const totalCapacity = trainerAgg[0]?.capacity || 0
    const usedCapacity = trainerAgg[0]?.used || 0

    const byStatus = (s) => payments.filter((p) => p.status === s)
    const paid = byStatus('paid')
    const pending = byStatus('pending')
    const failed = byStatus('failed')
    const refunded = byStatus('refunded')

    const sum = (arr) => arr.reduce((s, p) => s + p.amount, 0)

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

        totalRevenue: sum(paid),
        pendingAmount: sum(pending),
        paidCount: paid.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        refundedCount: refunded.length,

        paymentStatusData: [
            { key: 'paid', name: 'Paid', value: paid.length },
            { key: 'pending', name: 'Pending', value: pending.length },
            { key: 'failed', name: 'Failed', value: failed.length },
            { key: 'refunded', name: 'Refunded', value: refunded.length },
        ],
        clientDistribution: clientsPerTrainer.map((row) => ({
            name: nameById.get(String(row._id)) || 'Trainer',
            value: row.value,
        })),
        clientGrowth,
    }
}

// ---- Trainer dashboard stats ----
// Ports trainer/src/services/mockData.js `getStats()`.
export async function getTrainerStats(trainerId) {
    const [total, active, attention, followUps] = await Promise.all([
        Client.countDocuments({ trainer: trainerId }),
        Client.countDocuments({ trainer: trainerId, status: 'active' }),
        Client.countDocuments({ trainer: trainerId, status: 'active', progress: { $lt: 45 } }),
        FollowUp.find({ trainer: trainerId }, 'bucket'),
    ])

    const pendingFollowUps = followUps.filter((f) => f.bucket === 'overdue' || f.bucket === 'today').length
    const completedFollowUps = followUps.filter((f) => f.bucket === 'completed').length

    return { total, active, attention, pendingFollowUps, completedFollowUps }
}

// ---- Client compliance / weekly completion ----
// Ports user MyProgress: weeklyCompletion[] + complianceData[] + getTodayProgress.
export async function getClientCompletion(clientId, days = 7) {
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - (days - 1))

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
