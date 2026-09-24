import mongoose from 'mongoose'
import { REIMBURSEMENT_STATUS } from '../config/constants.js'

// Member-to-member referral: `referee` signed up using `referrer`'s code.
// `status` is the reimbursement state the admin sets from the Referrals page
// (pending -> reimbursed | rejected) — the referrer is paid back off-platform.
const memberReferralSchema = new mongoose.Schema(
    {
        referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
        referee: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        code: { type: String, required: true, uppercase: true, trim: true },
        date: { type: Date, default: Date.now },
        status: { type: String, enum: REIMBURSEMENT_STATUS, default: 'pending', index: true },
        statusChangedAt: { type: Date, default: null },
        note: { type: String, default: '', trim: true },
    },
    { timestamps: true },
)

// A member can only have been referred once.
memberReferralSchema.index({ referee: 1 }, { unique: true })

export const MemberReferral = mongoose.model('MemberReferral', memberReferralSchema)
