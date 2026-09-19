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

// A meal can offer several interchangeable options (e.g. Breakfast Option 1/2/3),
// each with its own food items. The client picks one via selectMealOption() —
// see dietPlans.controller.js — stored as `selectedOptionId` below, standing
// per-weekday (the same as `day` itself is a weekday template, not a date).
const optionSchema = new mongoose.Schema(
    {
        label: { type: String, default: 'Option 1', trim: true },
        items: { type: [itemSchema], default: [] },
    },
    { _id: true },
)

const mealSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        time: { type: String, default: '' },
        notes: { type: String, default: '' },
        // Links a meal to a client daily-checklist task key (user mockData taskId).
        taskKey: { type: String, default: null },
        options: { type: [optionSchema], default: [] },
        // Falls back to the first option when null/unset/stale (see
        // dietPlan.service.js resolveMeals -> pickSelectedOption).
        selectedOptionId: { type: mongoose.Schema.Types.ObjectId, default: null },
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

        // 'same': one shared meal set stored as a single "Everyday" day (no
        // duplication across weekdays). 'custom': a real per-weekday entry in
        // `days` for each of Monday–Sunday. Purely a UI-authoring concern —
        // resolveTodayDay() already treats "everyday" as a fallback, so
        // reading/resolving a plan needs no branching on this field.
        dayMode: { type: String, enum: ['same', 'custom'], default: 'same' },

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
