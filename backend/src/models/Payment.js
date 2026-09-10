import mongoose from 'mongoose'
import { PAYMENT_STATUS, MEMBERSHIP_PLANS } from '../config/constants.js'

// Billing records. Mirrors admin/src/services/mockData.js `payments[]` and drives
// the admin Payments page + dashboard revenue stats (stats.service.js):
//   totalRevenue  = sum(amount where status = 'paid')
//   pendingAmount = sum(amount where status = 'pending')
//   plus counts per status for the donut chart.
const paymentSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },

        plan: { type: String, enum: MEMBERSHIP_PLANS, required: true },
        amount: { type: Number, required: true, min: 0 }, // USD; PLAN_PRICES[plan]
        date: { type: Date, required: true, index: true },
        status: { type: String, enum: PAYMENT_STATUS, default: 'pending', index: true },
        method: { type: String, default: '' },
        txnId: { type: String, unique: true, sparse: true },
    },
    { timestamps: true },
)

export const Payment = mongoose.model('Payment', paymentSchema)
