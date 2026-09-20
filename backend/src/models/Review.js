import mongoose from 'mongoose'
import { REVIEW_MAX_RATING, REVIEW_MAX_COMMENT } from '../config/constants.js'

// A client's review of a trainer (user "Rate Trainer" page; trainer Reviews page;
// admin Reviews page). Only the authoring client writes one — trainers and
// admins can read but never edit or delete (there is no such route).
//
// One review per client/trainer pair: submitting again updates it rather than
// stacking a second rating. If the client is later reassigned, they can review
// the new trainer, and the old review stays with the old trainer.
const reviewSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        rating: { type: Number, required: true, min: 1, max: REVIEW_MAX_RATING },
        comment: { type: String, default: '', trim: true, maxlength: REVIEW_MAX_COMMENT },
    },
    { timestamps: true },
)

reviewSchema.index({ client: 1, trainer: 1 }, { unique: true })
// Trainer/admin lists read newest-first per trainer.
reviewSchema.index({ trainer: 1, createdAt: -1 })

export const Review = mongoose.model('Review', reviewSchema)
