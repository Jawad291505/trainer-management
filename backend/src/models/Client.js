import mongoose from 'mongoose'
import { CLIENT_GOALS, MEMBERSHIP_PLANS, ACCOUNT_STATUS } from '../config/constants.js'

// Client profile. One-to-one with a User (role: 'client').
// Fields mirror admin/trainer/user mockData.js client objects + currentClient.
const clientSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // Assignment. `null` == unassigned (admin Assignments page allows this).
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },

        // Consultation goal. Presets come from CLIENT_GOALS but "Other" lets a
        // trainer/admin type a custom one, so this is a free string, not an enum.
        goal: { type: String, default: CLIENT_GOALS[0], trim: true },
        plan: { type: String, enum: MEMBERSHIP_PLANS, default: 'Starter' },
        status: { type: String, enum: ACCOUNT_STATUS, default: 'active', index: true },

        // Weight tracking (user MyProgress: weightLost = startWeight - weight,
        // toGoal = weight - target). Kilograms.
        startWeight: { type: Number, default: null },
        weight: { type: Number, default: null },
        target: { type: Number, default: null },

        // 0-100 goal-completion percentage shown on every client card / table.
        progress: { type: Number, default: 0, min: 0, max: 100 },

        joinDate: { type: Date, default: Date.now },
        lastFollowUp: { type: Date, default: null },
        nextFollowUp: { type: Date, default: null },
    },
    { timestamps: true },
)

clientSchema.set('toJSON', { virtuals: true })

export const Client = mongoose.model('Client', clientSchema)
