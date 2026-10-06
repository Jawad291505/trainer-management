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
        // The actual (list) price. What a payer is charged is this minus
        // discountPercent — always derived via planFinalPrice(), never stored.
        priceMonthly: { type: Number, required: true, min: 0 },
        discountPercent: { type: Number, default: 0, min: 0, max: 100 },
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

// Price after the plan's percentage discount, rounded to a whole currency unit.
// Works on documents and lean/populated plain objects alike; plans saved before
// discountPercent existed have no discount. Mirrored by utils/plans.js in the
// admin and trainer apps.
export function planFinalPrice(plan) {
    const discount = Math.min(100, Math.max(0, Number(plan?.discountPercent) || 0))
    return Math.round(((Number(plan?.priceMonthly) || 0) * (100 - discount)) / 100)
}

// A plan whose final price is 0 is a free plan: no payment receipt is asked for
// and each payer may take a free plan only once (see subscription.service.js).
export const isFreePlan = (plan) => planFinalPrice(plan) === 0

export const SubscriptionPlan =mongoose.model('SubscriptionPlan', subscriptionPlanSchema)
