import { asyncHandler } from '../utils/asyncHandler.js'
import { Referral } from '../models/index.js'
import {
    ensureReferralCode,
    redeemReferralCode,
    getReferralOverview,
} from '../services/referral.service.js'

// GET /api/referrals/overview   (admin) — table rows + leaderboard + stats
export const overview = asyncHandler(async (_req, res) => {
    res.json(await getReferralOverview())
})

// GET /api/referrals/me   (trainer) — my code, who referred me, who I referred
export const myReferrals = asyncHandler(async (req, res) => {
    const code = await ensureReferralCode(req.trainer)

    const [referredByRec, made] = await Promise.all([
        Referral.findOne({ referee: req.trainer._id }).populate({
            path: 'referrer',
            populate: { path: 'user', select: 'name email' },
        }),
        Referral.find({ referrer: req.trainer._id }).populate({
            path: 'referee',
            populate: { path: 'user', select: 'name email' },
        }),
    ])

    res.json({
        code,
        referredBy: referredByRec
            ? {
                  name: referredByRec.referrer.user?.name,
                  email: referredByRec.referrer.user?.email,
                  date: referredByRec.date,
              }
            : null,
        referred: made.map((r) => ({
            id: String(r._id),
            name: r.referee.user?.name,
            email: r.referee.user?.email,
            date: r.date,
            status: r.status,
        })),
    })
})

// POST /api/referrals/redeem   (trainer)  Body: { code }
export const redeem = asyncHandler(async (req, res) => {
    try {
        const referral = await redeemReferralCode(req.trainer, req.body.code)
        res.status(201).json({ ok: true, referralId: String(referral._id) })
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message })
    }
})
