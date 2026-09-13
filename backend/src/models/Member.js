import mongoose from 'mongoose'
import { ACCOUNT_STATUS, MEMBER_ONBOARDING_STAGES } from '../config/constants.js'

// Member profile. One-to-one with a User (role: 'member'). A Member reuses the
// Admin portal but is scoped to only the Trainers assigned to them (Trainer.managedBy)
// and those Trainers' Clients — see middlewares/auth.js (req.member) and the
// scoping in trainers/clients/users controllers.
//
// Two provisioning paths, both landing here:
//  - Admin-invited (members.controller.js#createMember): status 'active' immediately.
//  - Self-signup (memberSignup.controller.js): status stays 'pending' through
//    onboardingStage until an Admin approves a submitted payment.
const memberSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        title: { type: String, default: 'Member', trim: true },
        status: { type: String, enum: ACCOUNT_STATUS, default: 'active', index: true },
        joinDate: { type: Date, default: Date.now },

        // Configurable by Super Admin — max Trainers this Member may have
        // assigned at once (enforced in trainers.controller#createTrainer).
        trainerLimit: { type: Number, default: 5, min: 0 },

        // Plan-based max Clients across all of this member's trainers combined
        // (enforced in clients.controller#createClient). Snapshotted from the
        // SubscriptionPlan at approval time so later plan edits don't silently
        // change an already-approved member's limit.
        clientLimit: { type: Number, default: 0, min: 0 },

        // Self-signup only — null for admin-invited members (they skip onboarding).
        onboardingStage: { type: String, enum: MEMBER_ONBOARDING_STAGES, default: null },
        plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        // Plan chosen but not yet paid/approved — drives the payment-submission page.
        pendingPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        // When the current `plan` is paid through — set on approval/renewal
        // (memberPayments.controller.js). Null until a plan is ever approved.
        planExpiryDate: { type: Date, default: null },
    },
    { timestamps: true },
)

export const Member = mongoose.model('Member', memberSchema)
