import mongoose from 'mongoose'
import { FOLLOWUP_BUCKETS } from '../config/constants.js'

// Trainer follow-up pipeline (trainer/src/portals/trainer/pages/FollowUps.jsx +
// Dashboard "pending follow-ups"). `bucket` is derived from `date` vs today
// (overdue / today / upcoming) but stored so a trainer can also mark one
// 'completed' explicitly.
const followUpSchema = new mongoose.Schema(
    {
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        date: { type: Date, required: true, index: true },
        bucket: { type: String, enum: FOLLOWUP_BUCKETS, default: 'upcoming', index: true },
        note: { type: String, default: '' },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export const FollowUp = mongoose.model('FollowUp', followUpSchema)
