import mongoose from 'mongoose'
import { EXERCISE_TECHNIQUES, LIBRARY_SOURCES } from '../config/constants.js'

// Exercise master data. Seeded verbatim from data/exerciseLibrary.json (240 rows
// across 10 categories, built from the Fit360OS exercise PDFs) and managed by
// the admin in admin/src/portals/admin/pages/Exercises.jsx.
//
// Trainers may add their own exercises on top (trainer LibraryContext) — those
// carry source: 'trainer' + an `owner`.
//
// NOTE: exercise rows carry NO metabolic / calorie / MET values in the source
// data. Nothing in the Admin, Trainer or User apps computes calorie expenditure
// from exercises — they are descriptive only (sets, reps, rest, technique,
// target muscle, equipment, video). The only "calculation" involving exercises
// is workout completion percentage, derived from checkbox state on an
// ExercisePlan, not from any field here.
const exerciseSchema = new mongoose.Schema(
    {
        // Stable library id, e.g. "X-barbell-bench-press" (front-end getExercise(id),
        // ExerciseModal onAdd -> exerciseId).
        code: { type: String, required: true, unique: true, trim: true, index: true },

        name: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true, index: true },

        // Training method enum — see ExerciseTechnique model + data/exerciseTechniques.json.
        technique: { type: String, enum: EXERCISE_TECHNIQUES, default: 'standard' },

        // Defaults that prefill the trainer's "Add exercise" form.
        defaultSets: { type: Number, default: 3, min: 1 },
        defaultReps: { type: String, default: '8-12' }, // string: ranges like "6-10", "AMRAP"
        defaultRest: { type: String, default: '60s' },

        youtube: { type: String, default: '' },
        notes: { type: String, default: '' }, // form / coaching cues
        equipment: { type: String, default: '' },
        target: { type: String, default: '' }, // primary muscle / body part

        source: { type: String, enum: LIBRARY_SOURCES, default: 'admin' },
        isMaster: { type: Boolean, default: true, index: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },
    },
    { timestamps: true },
)

exerciseSchema.set('toJSON', { virtuals: true })

export const Exercise = mongoose.model('Exercise', exerciseSchema)
