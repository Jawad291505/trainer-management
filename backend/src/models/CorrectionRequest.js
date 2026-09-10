import mongoose from 'mongoose'
import { CORRECTION_AREAS, CORRECTION_TYPES, CORRECTION_STATUS } from '../config/constants.js'

// Client -> Trainer correction requests ("Request a correction" on the client
// diet / exercise / progress pages; handled in the trainer Requests page).
// user/src/context/CorrectionsContext.jsx + trainer/src/context/CorrectionsContext.jsx.
const correctionRequestSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },

        area: { type: String, enum: CORRECTION_AREAS, required: true },
        item: { type: String, default: '' }, // which meal / exercise / weigh-in
        type: { type: String, enum: CORRECTION_TYPES, required: true },
        note: { type: String, required: true },

        status: { type: String, enum: CORRECTION_STATUS, default: 'open', index: true },
        reply: { type: String, default: '' }, // trainer's response
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export const CorrectionRequest = mongoose.model('CorrectionRequest', correctionRequestSchema)
