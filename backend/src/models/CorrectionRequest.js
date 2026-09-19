import mongoose from 'mongoose'
import {
    CORRECTION_AREAS, CORRECTION_TYPES, CORRECTION_STATUS, CORRECTION_TARGET_KINDS, CORRECTION_PRIORITY,
} from '../config/constants.js'

// Client -> Trainer correction requests ("Request a correction" on the client
// diet / exercise / progress pages; handled in the trainer Requests page).
// user/src/context/CorrectionsContext.jsx + trainer/src/context/CorrectionsContext.jsx.
const correctionRequestSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },

        area: { type: String, enum: CORRECTION_AREAS, required: true },
        item: { type: String, default: '' }, // display label: which meal / exercise / weigh-in
        // Structured pointer behind `item`, when the request was raised from a
        // specific meal / exercise: refId = the plan's meal or exercise _id,
        // date = the day (YYYY-MM-DD, PKT) the client was looking at.
        target: {
            kind: { type: String, enum: [...CORRECTION_TARGET_KINDS, null], default: null },
            refId: { type: mongoose.Schema.Types.ObjectId, default: null },
            date: { type: String, default: '' },
        },
        // Injury / pain requests are safety-relevant, so they are marked high.
        priority: { type: String, enum: CORRECTION_PRIORITY, default: 'normal', index: true },
        type: { type: String, enum: CORRECTION_TYPES, required: true },
        note: { type: String, required: true },

        status: { type: String, enum: CORRECTION_STATUS, default: 'open', index: true },
        reply: { type: String, default: '' }, // trainer's response
        // Set the first time the trainer opens the request, so the client knows
        // it has been looked at even while it is still open.
        seenAt: { type: Date, default: null },
        // On resolve for diet / exercise requests: was the published plan
        // actually edited after the request was raised? null = not applicable.
        planChanged: { type: Boolean, default: null },
        resolvedAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export const CorrectionRequest = mongoose.model('CorrectionRequest', correctionRequestSchema)
