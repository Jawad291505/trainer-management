import mongoose from 'mongoose'

// Training-technique enum shared by the admin, trainer and client apps for the
// Add/Edit Exercise forms and the technique badge. Seeded from
// data/exerciseTechniques.json (Standard / TUT / Super Set). Small, but it is
// master data that every Exercise references via `technique`, so it lives in its
// own collection rather than being hard-coded.
const exerciseTechniqueSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, trim: true }, // 'standard' | 'tut' | 'superset'
        label: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        order: { type: Number, default: 0 },
    },
    { timestamps: true },
)

export const ExerciseTechnique = mongoose.model('ExerciseTechnique', exerciseTechniqueSchema)
