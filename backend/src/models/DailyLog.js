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
        // For meal tasks: per-item completion (a client may eat 2 of 3 items).
        // `done` above stays true only once every entry here is true, so
        // existing completion-pct/compliance math keeps working unchanged.
        itemsDone: { type: [Boolean], default: undefined },
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

// Blood glucose reading logged around a meal — diabetic clients can record a
// "before" and/or "after" value per meal so the trainer can spot patterns
// (e.g. a specific meal spiking post-meal sugar).
const glucoseSchema = new mongoose.Schema(
    {
        mealId: { type: mongoose.Schema.Types.ObjectId, required: true },
        mealName: { type: String, default: '' },
        phase: { type: String, enum: ['before', 'after'], required: true },
        valueMgDl: { type: Number, required: true, min: 0, max: 1000 },
        note: { type: String, default: '' },
        source: { type: String, enum: ['client', 'trainer'], default: 'client' },
        takenAt: { type: Date, default: Date.now },
    },
    { timestamps: true },
)

const dailyLogSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        date: { type: Date, required: true }, // normalised to 00:00 local
        tasks: { type: [taskSchema], default: [] },
        cheats: { type: [cheatSchema], default: [] },
        glucoseReadings: { type: [glucoseSchema], default: [] },
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
