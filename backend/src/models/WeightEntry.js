import mongoose from 'mongoose'

// Weekly weigh-ins that power the "Weight Journey" chart (user MyProgress.jsx,
// trainer ClientProfile progress tab, admin ClientDetail). Source mock:
// `weightProgress[]` = [{ week, weight }].
const weightEntrySchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        date: { type: Date, required: true },
        weightKg: { type: Number, required: true, min: 0 },
        label: { type: String, default: '' }, // "W1", "W2" ... optional display label
        source: { type: String, enum: ['client', 'trainer'], default: 'client' },
    },
    { timestamps: true },
)

weightEntrySchema.index({ client: 1, date: 1 })

export const WeightEntry = mongoose.model('WeightEntry', weightEntrySchema)
