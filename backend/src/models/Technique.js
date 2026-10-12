import mongoose from 'mongoose'
import { LIBRARY_SOURCES, TECHNIQUE_LIMITS } from '../config/constants.js'

// Techniques Library — reusable coaching techniques (title + instructions + an
// optional YouTube demo) that trainers attach to the exercises of a client's plan.
//
// Same ownership model as Food / Exercise: rows created in the Admin portal are
// shared master data (`isMaster: true`, visible to every trainer); a trainer's
// own rows carry `source: 'trainer'` + an `owner` and are visible only to them.
//
// Not to be confused with ExerciseTechnique, the fixed Standard / TUT / Super Set
// enum an exercise carries in its `technique` key.
//
// Plans never reference these rows live: attaching a technique copies it onto
// the plan exercise (ExercisePlan -> techniqueSnapshotSchema), so editing or
// deleting a library technique can't change or break an assigned workout.
const techniqueSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true, maxlength: TECHNIQUE_LIMITS.title },
        instructions: { type: String, required: true, trim: true, maxlength: TECHNIQUE_LIMITS.instructions },
        youtube: { type: String, default: '', trim: true, maxlength: TECHNIQUE_LIMITS.youtube }, // optional

        source: { type: String, enum: LIBRARY_SOURCES, default: 'admin' },
        isMaster: { type: Boolean, default: true, index: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true },
)

techniqueSchema.set('toJSON', { virtuals: true })

export const Technique = mongoose.model('Technique', techniqueSchema)
