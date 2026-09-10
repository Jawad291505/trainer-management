import mongoose from 'mongoose'
import { REFERRAL_STATUS } from '../config/constants.js'

// Trainer-to-trainer referral records (data/referrals.json -> `referrals`).
// Admin reads these on the Referrals page (leaderboard + stats); the trainer app
// shows a trainer who they referred and who referred them.
// The trainer's own immutable referral CODE lives on the Trainer document.
const referralSchema = new mongoose.Schema(
    {
        referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        referee: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: REFERRAL_STATUS, default: 'pending' },
    },
    { timestamps: true },
)

// A trainer can only have been referred once.
referralSchema.index({ referee: 1 }, { unique: true })

export const Referral = mongoose.model('Referral', referralSchema)
