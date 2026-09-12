import mongoose from 'mongoose'
import { EXERCISE_PLAN_STATUS, EXERCISE_TECHNIQUES, TRACKING_TYPES } from '../config/constants.js'

// A client-specific exercise plan organised by training day
// (trainer ExercisePlans.jsx builder -> user MyExercises.jsx).
//
// Each entry may reference an Exercise from the master/custom library
// (`exercise` / `exerciseCode`) but the trainer can freely override sets, reps,
// rest, technique, video and instructions per client, so those are stored on the
// entry. `done` is the client's per-exercise completion checkbox — the only
// input to workout-completion percentage (there is no calorie maths).
const planExerciseSchema = new mongoose.Schema(
    {
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
        exerciseCode: { type: String, default: null, trim: true },

        name: { type: String, required: true, trim: true },
        sets: { type: Number, default: 3, min: 1 },
        reps: { type: String, default: '8-12' },
        rest: { type: String, default: '60s' },
        technique: { type: String, enum: EXERCISE_TECHNIQUES, default: 'standard' },
        youtube: { type: String, default: '' },
        instructions: { type: String, default: '' },

        // Whether a set is logged by reps or a held/timed duration, and optional
        // weight/duration targets carried into each WorkoutSession's set log.
        trackingType: { type: String, enum: TRACKING_TYPES, default: 'reps' },
        targetWeight: { type: Number, default: null, min: 0 }, // kg
        targetDuration: { type: Number, default: null, min: 0 }, // seconds

        done: { type: Boolean, default: false },
    },
    { _id: true },
)

const trainingDaySchema = new mongoose.Schema(
    {
        day: { type: String, required: true, trim: true }, // "Monday" / "Today"
        focus: { type: String, default: '' }, // "Chest & Triceps"
        // Free-text coaching note for this specific day (distinct from `focus`),
        // e.g. "Go light on the shoulder today, form over weight". Set by the
        // trainer, shown to the client above the day's exercises.
        note: { type: String, default: '' },
        exercises: { type: [planExerciseSchema], default: [] },
    },
    { _id: true },
)

const exercisePlanSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },

        title: { type: String, required: true, trim: true }, // "Push / Pull / Legs"
        status: { type: String, enum: EXERCISE_PLAN_STATUS, default: 'draft', index: true },

        // Which day the client should train now (user mockData exercisePlan.todayId).
        todayDayId: { type: mongoose.Schema.Types.ObjectId, default: null },

        days: { type: [trainingDaySchema], default: [] },
        publishedAt: { type: Date, default: null },
    },
    { timestamps: true },
)

exercisePlanSchema.index({ client: 1, status: 1 })

export const ExercisePlan = mongoose.model('ExercisePlan', exercisePlanSchema)
