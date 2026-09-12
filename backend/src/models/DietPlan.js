import mongoose from 'mongoose'
import { DIET_PLAN_STATUS } from '../config/constants.js'

// A client-specific diet plan built by a trainer
// (trainer DietPlans.jsx) and consumed by the client (user MyDiet.jsx).
//
// Storage principle (matches user/src/services/mockData.js `dietPlan`):
// a meal item stores ONLY { food ref, foodCode, qty }. Calories / protein /
// carbs / fat / GI / GL are NEVER persisted here — they are derived on read by
// dietPlan.service.js via nutrition.service.js, so the client always sees the
// exact same numbers the trainer saw and a Food edit flows through automatically.
const itemSchema = new mongoose.Schema(
    {
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
        foodCode: { type: String, required: true, trim: true },
        qty: { type: Number, required: true, min: 0 },
    },
    { _id: false },
)

const mealSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        time: { type: String, default: '' },
        notes: { type: String, default: '' },
        // Links a meal to a client daily-checklist task key (user mockData taskId).
        taskKey: { type: String, default: null },
        items: { type: [itemSchema], default: [] },
    },
    { _id: true },
)

// A single day's worth of meals. `day` is a free-text identifier ("Monday",
// "Everyday", "Today") matched case-insensitively at read time — see
// resolveTodayDay() in utils/pktTime.js. Mirrors ExercisePlan's trainingDaySchema.
const dietDaySchema = new mongoose.Schema(
    {
        day: { type: String, required: true, trim: true },
        meals: { type: [mealSchema], default: [] },
    },
    { _id: true },
)

const dietPlanSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },

        title: { type: String, required: true, trim: true }, // "Fat Loss — Week 6"
        status: { type: String, enum: DIET_PLAN_STATUS, default: 'draft', index: true },

        // If this plan was seeded from an admin template, remember which one.
        sourceTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'DietPlanTemplate', default: null },

        // Which day the client should see now (mirrors ExercisePlan.todayDayId).
        // Optional override — resolveTodayDay() falls back to weekday-name matching.
        todayDayId: { type: mongoose.Schema.Types.ObjectId, default: null },

        days: { type: [dietDaySchema], default: [] },
        publishedAt: { type: Date, default: null },
    },
    { timestamps: true },
)

// One active plan per client keeps the client app's "my current plan" simple.
dietPlanSchema.index({ client: 1, status: 1 })

export const DietPlan = mongoose.model('DietPlan', dietPlanSchema)
