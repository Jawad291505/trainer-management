import mongoose from 'mongoose'

// GI / GL classification thresholds. A singleton document (key: 'default').
// Seeded from data/foodLibrary.json -> `thresholds`, which the front-end reads
// as `glycemicThresholds` (trainer/src/services/foodLibrary.js) and feeds into
// utils/nutrition.js levelFor(). Kept in the DB so the admin can tune the
// low/medium/high bands without a code change.
//
//   gi     (per food):  Low < medium, Medium >= medium, High >= high
//   glItem (per food):  same bands, applied to a single item's Glycemic Load
//   glMeal (per meal):  same bands, applied to the summed meal Glycemic Load
const bandSchema = new mongoose.Schema(
    { medium: { type: Number, required: true }, high: { type: Number, required: true } },
    { _id: false },
)

const nutritionConfigSchema = new mongoose.Schema(
    {
        key: { type: String, default: 'default', unique: true },
        gi: { type: bandSchema, required: true },
        glItem: { type: bandSchema, required: true },
        glMeal: { type: bandSchema, required: true },
    },
    { timestamps: true },
)

nutritionConfigSchema.statics.getDefault = async function () {
    let doc = await this.findOne({ key: 'default' })
    if (!doc) {
        doc = await this.create({
            key: 'default',
            gi: { medium: 56, high: 70 },
            glItem: { medium: 11, high: 20 },
            glMeal: { medium: 20, high: 30 },
        })
    }
    return doc
}

export const NutritionConfig = mongoose.model('NutritionConfig', nutritionConfigSchema)
