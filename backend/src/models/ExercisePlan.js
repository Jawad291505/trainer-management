import mongoose from 'mongoose'
import { EXERCISE_LINK_TYPES, EXERCISE_PLAN_STATUS, EXERCISE_TECHNIQUES, TRACKING_TYPES } from '../config/constants.js'

// A Techniques Library entry as it was when the trainer attached it. Stored as a
// copy (not a live reference) so later edits or deletion of the library row never
// change or break a plan that is already assigned; `technique` only records where
// the copy came from.
export const techniqueSnapshotSchema = new mongoose.Schema(
    {
        technique: { type: mongoose.Schema.Types.ObjectId, ref: 'Technique', default: null },
        title: { type: String, required: true, trim: true },
        instructions: { type: String, default: '' },
        youtube: { type: String, default: '' },
    },
    { _id: true },
)

// A group of two or more exercises of one training day performed together
// (superset, paired movements, a multi-step sequence). Exercises join a group by
// carrying its `key` in `linkKey`; their order within the group is their order in
// the day's `exercises` array. Linking never copies an exercise.
export const exerciseLinkSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, trim: true },
        type: { type: String, enum: EXERCISE_LINK_TYPES, default: 'superset' },
        note: { type: String, default: '', trim: true },
        techniques: { type: [techniqueSnapshotSchema], default: [] }, // apply to the whole group
    },
    { _id: false },
)

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
        // Muscle group — the library exercise's category ("Chest", "Back"…), copied
        // here so every plan card can head the exercise with it.
        category: { type: String, default: '', trim: true },
        sets: { type: Number, default: 3, min: 1 },
        reps: { type: String, default: '8-12' },
        rest: { type: String, default: '60s' },
        technique: { type: String, enum: EXERCISE_TECHNIQUES, default: 'standard' },
        youtube: { type: String, default: '' },
        instructions: { type: String, default: '' },

        // Techniques Library entries attached to this exercise (copies — see above).
        techniques: { type: [techniqueSnapshotSchema], default: [] },
        // `key` of the day's link group this exercise belongs to, if any.
        linkKey: { type: String, default: null },

        // Whether a set is logged by reps or a held/timed duration, and optional
        // weight/duration targets carried into each WorkoutSession's set log.
        trackingType: { type: String, enum: TRACKING_TYPES, default: 'reps' },
        targetWeight: { type: Number, default: null, min: 0 }, // kg
        targetDuration: { type: Number, default: null, min: 0 }, // seconds

        // Trainer-flagged priority exercise — shown to the client with a star + "Important".
        important: { type: Boolean, default: false },

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
        links: { type: [exerciseLinkSchema], default: [] },
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
