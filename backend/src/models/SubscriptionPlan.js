import mongoose from 'mongoose'
import { PLAN_AUDIENCES } from '../config/constants.js'

// Member subscription tiers — Super Admin managed (subscriptionPlans.controller.js)
// so new plans/prices/limits can be added without a code change. Referenced by
// Member.plan (approved) / Member.pendingPlan (selected, awaiting payment) and
// snapshotted onto each MemberPayment at submission time.
const subscriptionPlanSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        // Who can pick this plan at signup. Docs saved before this field existed
        // are treated as 'member' plans (see subscriptionPlans.controller).
        audience: { type: String, enum: PLAN_AUDIENCES, default: 'member', index: true },
        priceMonthly: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'PKR', trim: true },
        maxClients: { type: Number, required: true, min: 0 },
        // Never allowed to exceed maxClients — a plan can't grant more trainer
        // seats than client seats (validated below and in the controller).
        maxTrainers: {
            type: Number,
            required: true,
            min: 0,
            validate: {
                validator: function validator(v) { return v <= this.maxClients },
                message: 'maxTrainers cannot exceed maxClients',
            },
        },
        description: { type: String, default: '', trim: true },

        // Inactive plans stay visible to already-subscribed members but drop off
        // the signup plan-selection screen — lets Admin retire a plan without
        // deleting history that MemberPayment/Member.plan still reference.
        active: { type: Boolean, default: true, index: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true },
)

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
