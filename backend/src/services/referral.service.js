import { Trainer, Referral } from '../models/index.js'

// Readable NAME-XXXX code — mirrors trainer/src/services/referrals.js
// generateCode(): first name uppercased + 4 chars from an unambiguous alphabet.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateReferralCode(name) {
    const prefix =
        (name || 'TRAINER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'TRAINER'
    let suffix = ''
    for (let i = 0; i < 4; i += 1) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    return `${prefix}-${suffix}`
}

// Issue a code exactly ONCE. If the trainer already has one, return it unchanged.
export async function ensureReferralCode(trainer) {
    if (trainer.referralCode) return trainer.referralCode
    const user = await trainer.populate('user')
    let code
    // Retry a few times on the (tiny) chance of a collision.
    for (let attempt = 0; attempt < 6; attempt += 1) {
        code = generateReferralCode(user.user?.name)
        const clash = await Trainer.exists({ referralCode: code })
        if (!clash) break
    }
    trainer.referralCode = code
    await trainer.save()
    return code
}

// Redeem another trainer's code. One-time only (Referral has a unique index on
// referee). Returns the created Referral or throws a plain Error with a message.
export async function redeemReferralCode(refereeTrainer, rawCode) {
    const already = await Referral.findOne({ referee: refereeTrainer._id })
    if (already) throw new Error('You have already been referred by a trainer.')

    const code = String(rawCode || '').trim().toUpperCase()
    if (!code) throw new Error('Enter a referral code.')

    const referrer = await Trainer.findOne({ referralCode: code })
    if (!referrer) throw new Error('That referral code was not recognised.')
    if (String(referrer._id) === String(refereeTrainer._id)) {
        throw new Error('You cannot redeem your own referral code.')
    }

    const referral = await Referral.create({
        referrer: referrer._id,
        referee: refereeTrainer._id,
        code,
        date: new Date(),
        status: 'joined',
    })
    refereeTrainer.referredBy = referrer._id
    await refereeTrainer.save()
    return referral
}

// Admin Referrals page: leaderboard + headline stats
// (admin/src/services/referrals.js buildLeaderboard / getReferralStats).
export async function getReferralOverview() {
    const [referrals, trainers] = await Promise.all([
        Referral.find({}).populate({ path: 'referrer referee', populate: { path: 'user', select: 'name email' } }),
        Trainer.find({}).populate('user', 'name email'),
    ])

    const counts = new Map()
    for (const r of referrals) {
        const id = String(r.referrer._id)
        const cur = counts.get(id) || { joined: 0, pending: 0 }
        cur[r.status === 'joined' ? 'joined' : 'pending'] += 1
        counts.set(id, cur)
    }

    const leaderboard = trainers
        .map((t) => {
            const c = counts.get(String(t._id)) || { joined: 0, pending: 0 }
            return {
                trainerId: String(t._id),
                name: t.user?.name || '—',
                email: t.user?.email || '',
                code: t.referralCode || null,
                joined: c.joined,
                pending: c.pending,
                total: c.joined + c.pending,
            }
        })
        .sort((a, b) => b.total - a.total || b.joined - a.joined)

    const joined = referrals.filter((r) => r.status === 'joined').length
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const last30 = referrals.filter((r) => r.date >= monthAgo).length
    const top = leaderboard.find((t) => t.total > 0) || null

    return {
        rows: referrals
            .map((r) => ({
                id: String(r._id),
                code: r.code,
                date: r.date,
                status: r.status,
                referrerName: r.referrer.user?.name || '—',
                refereeName: r.referee.user?.name || '—',
                refereeEmail: r.referee.user?.email || '',
            }))
            .sort((a, b) => new Date(b.date) - new Date(a.date)),
        leaderboard,
        stats: {
            total: referrals.length,
            joined,
            pending: referrals.length - joined,
            last30,
            topReferrerName: top ? top.name : '—',
            topReferrerCount: top ? top.total : 0,
        },
    }
}
