import mongoose from 'mongoose'
import { ACTIVITY_TYPES } from '../config/constants.js'

// One document per client per day: the "check off what you did today" list that
// the whole client-tracking model is built on (plan.md sections 27, 30). The
// client ticks items; the trainer sees completion.
//
// Derived numbers (computed in progress.controller.js / stats.service.js, not
// stored):
//   completionPct (day)  = doneTasks / totalTasks * 100        (user Dashboard getTodayProgress)
//   weeklyCompletion[]    = per-day completionPct for the last 7 days (charts)
//   compliance by type    = done/total grouped by task.type   (user MyProgress complianceData)
const taskSchema = new mongoose.Schema(
    {
        key: { type: String, required: true }, // stable key, e.g. "breakfast", "water"
        label: { type: String, required: true }, // "Breakfast — Oats & egg whites"
        type: { type: String, enum: ACTIVITY_TYPES, default: 'meal' },
        time: { type: String, default: '' },
        done: { type: Boolean, default: false },
        // Optional link back to the diet-plan meal this task represents.
        mealId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    { _id: false },
)

const cheatSchema = new mongoose.Schema(
    {
        mealId: { type: mongoose.Schema.Types.ObjectId, required: true }, // which planned meal was skipped
        mealName: { type: String, default: '' },
        note: { type: String, default: '' }, // free-text: "Had pizza instead"
        items: { type: [String], default: [] }, // quick list of what they ate
    },
    { _id: true },
)

const dailyLogSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        date: { type: Date, required: true }, // normalised to 00:00 local
        tasks: { type: [taskSchema], default: [] },
        cheats: { type: [cheatSchema], default: [] },
    },
    { timestamps: true },
)

dailyLogSchema.index({ client: 1, date: 1 }, { unique: true })

// Convenience: completion percentage for this day.
dailyLogSchema.virtual('completionPct').get(function () {
    if (!this.tasks.length) return 0
    const done = this.tasks.filter((t) => t.done).length
    return Math.round((done / this.tasks.length) * 100)
})

dailyLogSchema.set('toJSON', { virtuals: true })

export const DailyLog = mongoose.model('DailyLog', dailyLogSchema)
