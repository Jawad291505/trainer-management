import mongoose from 'mongoose'

// The rolling 7-day grocery window is an "anchor" only — the actual line
// items are always derived fresh from the client's current DietPlan +
// selected meal options (see services/groceryList.service.js), the same
// "derive, don't store" convention DietPlan itself follows. This document
// just remembers where the 7-day window starts and when it was last reset.
const groceryListSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, unique: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
        windowStart: { type: Date, required: true },
        refreshedAt: { type: Date, required: true },
    },
    { timestamps: true },
)

export const GroceryList = mongoose.model('GroceryList', groceryListSchema)
