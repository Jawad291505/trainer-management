import mongoose from 'mongoose'
import { FOLLOWUP_BUCKETS, FOLLOWUP_STATUS, FOLLOWUP_TYPES } from '../config/constants.js'

// Trainer <-> client follow-up (trainer FollowUps page, client Follow-ups page,
// Dashboard "pending follow-ups"). Lifecycle: scheduled -> completed | missed.
// `bucket` is the display grouping (overdue / today / upcoming / completed /
// missed); it is derived from `date` + `status` on every read
// (services/followUp.service.js -> bucketFor) and only stored for convenience.
//
// Visibility: `note` (the agenda) and `outcome` (what was discussed, written on
// completion) are shown to the client; `privateNote` is trainer-only.
const followUpSchema = new mongoose.Schema(
    {
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        date: { type: Date, required: true, index: true },
        time: { type: String, default: '' }, // 24h "HH:mm", optional
        type: { type: String, enum: FOLLOWUP_TYPES, default: 'check-in' },
        status: { type: String, enum: FOLLOWUP_STATUS, default: 'scheduled', index: true },
        bucket: { type: String, enum: FOLLOWUP_BUCKETS, default: 'upcoming', index: true },
        note: { type: String, default: '' },
        outcome: { type: String, default: '' },
        privateNote: { type: String, default: '' },
        completedAt: { type: Date, default: null },

        // The ScheduleActivity mirroring this follow-up on the trainer/client calendars.
        scheduleActivity: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleActivity', default: null },

        // Reminder bookkeeping so the daily job never notifies twice for one
        // date. Reset whenever the follow-up is rescheduled.
        reminders: {
            dayBefore: { type: Boolean, default: false },
            dayOf: { type: Boolean, default: false },
            overdue: { type: Boolean, default: false },
        },
    },
    { timestamps: true },
)

export const FollowUp = mongoose.model('FollowUp', followUpSchema)
