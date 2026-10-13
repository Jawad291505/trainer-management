import mongoose from 'mongoose'
import { CLIENT_GOALS, EXERCISE_TECHNIQUES, TRACKING_TYPES } from '../config/constants.js'

// Reusable exercise-plan templates managed by the admin (admin LibraryContext ->
// exercisePlans, admin/src/portals/admin/pages/ExercisePlans.jsx). A trainer
// picks one in trainer/src/portals/trainer/pages/ExercisePlans.jsx and the app
// COPIES its training days/exercises into the client's ExercisePlan — the
// template is never mutated by a trainer.
//
// Entries reference Exercise master data by `exerciseCode`; name, category and
// the sets/reps/rest prescription are stored on the entry (as on ExercisePlan)
// so a template still reads correctly after a library exercise is edited or
// deleted. Templates carry no link groups, library techniques or `done` state —
// the trainer adds those per client.
const templateExerciseSchema = new mongoose.Schema(
    {
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
        exerciseCode: { type: String, default: null, trim: true },

        name: { type: String, required: true, trim: true },
        category: { type: String, default: '', trim: true },
        sets: { type: Number, default: 3, min: 1 },
        reps: { type: String, default: '8-12' },
        rest: { type: String, default: '60s' },
        technique: { type: String, enum: EXERCISE_TECHNIQUES, default: 'standard' },
        youtube: { type: String, default: '' },
        instructions: { type: String, default: '' },

        trackingType: { type: String, enum: TRACKING_TYPES, default: 'reps' },
        targetWeight: { type: Number, default: null, min: 0 }, // kg
        targetDuration: { type: Number, default: null, min: 0 }, // seconds

        important: { type: Boolean, default: false },
    },
    { _id: true },
)

const templateDaySchema = new mongoose.Schema(
    {
        day: { type: String, required: true, trim: true }, // weekday name — "Monday"
        focus: { type: String, default: '' }, // "Chest & Triceps"
        note: { type: String, default: '' },
        exercises: { type: [templateExerciseSchema], default: [] },
    },
    { _id: true },
)

const exercisePlanTemplateSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        goal: { type: String, default: CLIENT_GOALS[0], trim: true },
        description: { type: String, default: '' },
        days: { type: [templateDaySchema], default: [] },
    },
    { timestamps: true },
)

export const ExercisePlanTemplate = mongoose.model('ExercisePlanTemplate', exercisePlanTemplateSchema)
