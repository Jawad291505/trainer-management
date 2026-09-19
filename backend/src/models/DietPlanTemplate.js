import mongoose from 'mongoose'
import { CLIENT_GOALS } from '../config/constants.js'

// Reusable "General Diet Plan" templates managed by the admin
// (admin LibraryContext -> dietPlans, data/dietPlans.json, max 4). A trainer
// picks one in trainer/src/portals/trainer/pages/DietPlans.jsx and the app
// COPIES its meals/foods into the client's DietPlan — the template is never
// mutated by a trainer.
//
// Meal items reference Food master data by `foodCode` (== data/dietPlans.json
// item.foodId). Denormalised name/qty/unit are kept for display; live macros are
// derived by nutrition.service.js from the linked Food + qty.
const templateItemSchema = new mongoose.Schema(
    {
        food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', default: null },
        foodCode: { type: String, required: true, trim: true },
        food_name: { type: String, default: '' }, // data/dietPlans.json stores `food`
        qty: { type: Number, required: true, min: 0 },
        unit: { type: String, default: 'g' },
    },
    { _id: false },
)

// Mirrors DietPlan's optionSchema — templates can also offer multiple options
// per meal, copied verbatim (including all options) into a fresh client plan.
const templateOptionSchema = new mongoose.Schema(
    {
        label: { type: String, default: 'Option 1', trim: true },
        items: { type: [templateItemSchema], default: [] },
    },
    { _id: true },
)

const templateMealSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true }, // Breakfast / Lunch / ...
        time: { type: String, default: '' }, // "08:00"
        notes: { type: String, default: '' },
        options: { type: [templateOptionSchema], default: [] },
    },
    { _id: true },
)

const dietPlanTemplateSchema = new mongoose.Schema(
    {
        code: { type: String, trim: true }, // data/dietPlans.json id, e.g. "DP-1"
        name: { type: String, required: true, trim: true },
        goal: { type: String, default: CLIENT_GOALS[0], trim: true },
        description: { type: String, default: '' },
        meals: { type: [templateMealSchema], default: [] },
    },
    { timestamps: true },
)

export const DietPlanTemplate = mongoose.model('DietPlanTemplate', dietPlanTemplateSchema)
