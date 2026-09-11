import mongoose from 'mongoose'
import { FOOD_UNITS, LIBRARY_SOURCES } from '../config/constants.js'

// Food master data. Seeded verbatim from data/foodLibrary.json (200 rows built
// from the Fit360OS Food Exchange List PDF) and managed by the admin in
// admin/src/portals/admin/pages/Foods.jsx.
//
// Trainers may also add their own foods on top of the master library
// (trainer/src/context/LibraryContext.jsx). Those carry source: 'trainer' and an
// `owner` — they are per-trainer, never part of the shared master library.
//
// Field names/units are preserved exactly so nutrition.service.js
// (the port of utils/nutrition.js) keeps producing identical macros:
//   base   - the amount the macros are measured against
//   cal/protein/carbs/fat/fiber - per `base` `unit`
//   gi     - Glycemic Index (0 when negligible)
//   gl     - Glycemic Load for the reference `base` serving (display only; live
//            GL is recomputed from qty by nutrition.service.js)
const foodSchema = new mongoose.Schema(
    {
        // Stable library id, e.g. "F-white-rice". Maps to the `id` field used by
        // every front-end (getFood(id), item.foodId in diet plans).
        code: { type: String, required: true, unique: true, trim: true, index: true },

        // Original row number in the source PDF (data/foodLibrary.json -> pdfId).
        pdfId: { type: Number, default: null },

        name: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true, index: true },

        unit: { type: String, enum: FOOD_UNITS, default: 'g' },
        base: { type: Number, required: true, min: 0.0001 },
        step: { type: Number, default: 10 },
        defaultQty: { type: Number, default: 100 },
        serving: { type: String, default: '' }, // human label e.g. "1/2 cup"
        servingWeight: { type: Number, default: null }, // grams per 1 serving unit (e.g. 50 for 1 egg)

        gi: { type: Number, default: 0, min: 0 },
        gl: { type: Number, default: 0, min: 0 },
        cal: { type: Number, default: 0, min: 0 },
        protein: { type: Number, default: 0, min: 0 },
        carbs: { type: Number, default: 0, min: 0 },
        fat: { type: Number, default: 0, min: 0 },
        fiber: { type: Number, default: 0, min: 0 },

        source: { type: String, enum: LIBRARY_SOURCES, default: 'admin' },
        // Master library rows: isMaster: true, owner: null.
        // Trainer-custom rows:  isMaster: false, owner: <Trainer _id>.
        isMaster: { type: Boolean, default: true, index: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },
    },
    { timestamps: true },
)

foodSchema.set('toJSON', { virtuals: true })

export const Food = mongoose.model('Food', foodSchema)
