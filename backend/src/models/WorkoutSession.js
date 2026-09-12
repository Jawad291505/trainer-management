import mongoose from 'mongoose'
import { EXERCISE_TECHNIQUES, TRACKING_TYPES, WORKOUT_SESSION_STATUS } from '../config/constants.js'

// A single logged set within a performed workout: the target copied from the
// plan at start time, plus whatever the client actually did.
const setLogSchema = new mongoose.Schema(
    {
        setNumber: { type: Number, required: true },
        targetReps: { type: String, default: '' },
        targetWeight: { type: Number, default: null },
        targetDuration: { type: Number, default: null },

        actualReps: { type: Number, default: null },
        actualWeight: { type: Number, default: null },
        actualDuration: { type: Number, default: null },

        completed: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
    },
    { _id: false },
)

// One exercise within a performed workout, snapshotted from the ExercisePlan
// day exercise (`planExerciseId`) so trainer edits to the plan afterwards
// don't rewrite history.
const sessionExerciseSchema = new mongoose.Schema(
    {
        planExerciseId: { type: mongoose.Schema.Types.ObjectId, default: null },
        exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },

        name: { type: String, required: true },
        technique: { type: String, enum: EXERCISE_TECHNIQUES, default: 'standard' },
        trackingType: { type: String, enum: TRACKING_TYPES, default: 'reps' },

        targetSets: { type: Number, default: 3 },
        targetReps: { type: String, default: '8-12' },
        targetRest: { type: String, default: '60s' },
        youtube: { type: String, default: '' },
        instructions: { type: String, default: '' },

        sets: { type: [setLogSchema], default: [] },
        notes: { type: String, default: '' },
    },
    { _id: true },
)

// A client's run through one training day: Workout -> Exercise -> Sets ->
// Completion/Performance. One document per client per calendar day (mirrors
// DailyLog's {client, date} uniqueness), created by
// POST /exercise-plans/:id/sessions/start and driven through to
// POST /workout-sessions/:id/finish by the mobile "Start Workout" flow.
const workoutSessionSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        exercisePlan: { type: mongoose.Schema.Types.ObjectId, ref: 'ExercisePlan', required: true, index: true },

        dayId: { type: mongoose.Schema.Types.ObjectId, required: true },
        day: { type: String, default: '' }, // "Monday"
        focus: { type: String, default: '' }, // "Chest & Triceps"
        // Snapshot of the plan day's coaching `note` at start time, so it stays
        // stable even if the trainer edits the plan mid-workout.
        dayNote: { type: String, default: '' },

        date: { type: Date, required: true }, // PKT start-of-day (pktStartOfDay)

        status: { type: String, enum: WORKOUT_SESSION_STATUS, default: 'in_progress', index: true },
        startedAt: { type: Date, default: () => new Date() },
        completedAt: { type: Date, default: null },

        exercises: { type: [sessionExerciseSchema], default: [] },
        notes: { type: String, default: '' }, // overall workout notes, set on finish
    },
    { timestamps: true },
)

// Not unique: a client may run any day's workout at any time (including
// redoing one already completed today, or doing a second day the same day) —
// only one "in_progress" session per {client, dayId, date} is resumed; a new
// start once that's completed always begins a fresh attempt.
workoutSessionSchema.index({ client: 1, dayId: 1, date: 1 })

export const WorkoutSession = mongoose.model('WorkoutSession', workoutSessionSchema)
