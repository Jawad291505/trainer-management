import mongoose from 'mongoose'
import { ACCOUNT_STATUS } from '../config/constants.js'

// Trainer profile. One-to-one with a User (role: 'trainer').
// Fields mirror admin/src/services/mockData.js `trainers[]` plus the referral
// registry (data/referrals.json) surfaced in trainer Settings + admin Referrals.
const trainerSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        specialization: { type: String, default: 'General Fitness', trim: true },

        // "18 / 25" capacity widget (admin CapacityBar). `clientCount` is a
        // denormalised counter kept in step with Client.trainer assignments; the
        // authoritative number is always Client.countDocuments({ trainer }).
        capacity: { type: Number, default: 20, min: 0 },
        clientCount: { type: Number, default: 0, min: 0 },

        rating: { type: Number, default: 5, min: 0, max: 5 },
        revenue: { type: Number, default: 0, min: 0 }, // lifetime, USD
        status: { type: String, enum: ACCOUNT_STATUS, default: 'active', index: true },
        joinDate: { type: Date, default: Date.now },

        // Trainer-to-trainer referrals. Code is issued ONCE and is immutable
        // (trainer/src/services/referrals.js). `referredBy` is a one-time link.
        referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
        referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null },
    },
    { timestamps: true },
)

trainerSchema.virtual('availableSlots').get(function () {
    return Math.max(0, (this.capacity || 0) - (this.clientCount || 0))
})

trainerSchema.set('toJSON', { virtuals: true })

export const Trainer = mongoose.model('Trainer', trainerSchema)
