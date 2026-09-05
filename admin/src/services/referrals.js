// Trainer-to-trainer referral tracking for the admin portal.
//
// The registry lives at the workspace root in /data/referrals.json — the same
// file the Trainer app reads/writes — so admin sees who referred whom. When a
// backend arrives this JSON import becomes an API call.

import registry from '@data/referrals.json'

export const referralTrainers = registry.trainers
export const referralSeed = registry.referrals

export function trainerById(id) {
    return referralTrainers.find((t) => t.id === id) || null
}

// Flatten the raw referral records into table-ready rows with resolved names.
export function buildReferralRows() {
    return referralSeed
        .map((r) => {
            const referrer = trainerById(r.referrerId)
            const referee = trainerById(r.refereeId)
            return {
                id: r.id,
                code: r.code,
                date: r.date,
                status: r.status,
                referrerId: r.referrerId,
                referrerName: referrer?.name || r.referrerId,
                referrerColor: undefined,
                refereeId: r.refereeId,
                refereeName: referee?.name || r.refereeId,
                refereeEmail: referee?.email || '',
            }
        })
        .sort((a, b) => b.date.localeCompare(a.date))
}

// Per-trainer leaderboard: how many trainers each one has brought in.
export function buildLeaderboard() {
    const counts = new Map()
    referralSeed.forEach((r) => {
        const cur = counts.get(r.referrerId) || { joined: 0, pending: 0 }
        cur[r.status === 'joined' ? 'joined' : 'pending'] += 1
        counts.set(r.referrerId, cur)
    })
    return referralTrainers
        .map((t) => {
            const c = counts.get(t.id) || { joined: 0, pending: 0 }
            return { ...t, joined: c.joined, pending: c.pending, total: c.joined + c.pending }
        })
        .sort((a, b) => b.total - a.total || b.joined - a.joined)
}

export function getReferralStats() {
    const rows = referralSeed
    const joined = rows.filter((r) => r.status === 'joined').length
    const pending = rows.length - joined
    const now = new Date('2026-09-06')
    const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().slice(0, 10)
    const last30 = rows.filter((r) => r.date >= monthStart).length
    const board = buildLeaderboard()
    const top = board.find((t) => t.total > 0) || null
    return {
        total: rows.length,
        joined,
        pending,
        last30,
        topReferrerName: top ? top.name : '—',
        topReferrerCount: top ? top.total : 0,
    }
}
