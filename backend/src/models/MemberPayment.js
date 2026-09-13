import mongoose from 'mongoose'
import { MEMBER_PAYMENT_STATUS } from '../config/constants.js'

// One proof-of-payment submission from a self-signup Member
// (memberPayments.controller.js). A member may have several of these over time
// (rejected -> resubmit), so history is kept rather than overwritten in place.
const memberPaymentSchema = new mongoose.Schema(
    {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true, index: true },
        plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },

        // Snapshotted from the plan at submission time — survives the plan being
        // edited or deactivated later, and is what the Admin review screen shows.
        planName: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'PKR' },
        maxClients: { type: Number, required: true },
        maxTrainers: { type: Number, required: true },

        // Cloudinary — never the raw image (see services/cloudinary.service.js).
        // Only present for self-signup submissions; an admin-entered renewal has
        // no screenshot (see `source` below).
        screenshotUrl: { type: String, default: '' },
        screenshotPublicId: { type: String, default: '' },

        // 'self_signup' = member submitted proof-of-payment for review;
        // 'admin_renewal' = admin manually recorded a renewal (auto-approved,
        // no screenshot). Distinguishes the two creation paths in history.
        source: { type: String, enum: ['self_signup', 'admin_renewal'], default: 'self_signup' },

        status: { type: String, enum: MEMBER_PAYMENT_STATUS, default: 'pending', index: true },
        submittedAt: { type: Date, default: Date.now },
        reviewedAt: { type: Date, default: null },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        rejectionReason: { type: String, default: '', trim: true },
    },
    { timestamps: true },
)

export const MemberPayment = mongoose.model('MemberPayment', memberPaymentSchema)
