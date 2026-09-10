import mongoose from 'mongoose'
import { SCHEDULE_SCOPES, ACTIVITY_TYPES, SCHEDULE_STATUS } from '../config/constants.js'

// Unified schedule entry used by both the trainer schedule
// (trainer/src/context/ScheduleContext.jsx: `today` list + `week` grid Mon-Sun)
// and the client schedule (user/src/context/ScheduleContext.jsx: `today` +
// `upcoming`).
//
// `scope` encodes which bucket the entry belongs to:
//   'today'                 - today's timeline (has `time`, `status`)
//   'Mon'..'Sun'            - trainer weekly grid (has `time`)
//   'upcoming'              - client upcoming list (has `date`)
const scheduleActivitySchema = new mongoose.Schema(
    {
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        ownerRole: { type: String, enum: ['trainer', 'client'], required: true },

        // Only set for trainer entries tied to a specific client.
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },

        scope: { type: String, enum: SCHEDULE_SCOPES, required: true, index: true },
        date: { type: Date, default: null }, // for 'upcoming'
        time: { type: String, default: '' }, // "08:00"
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ACTIVITY_TYPES, default: 'workout' },
        notes: { type: String, default: '' },

        status: { type: String, enum: SCHEDULE_STATUS, default: 'upcoming' }, // trainer 'today'
        done: { type: Boolean, default: false }, // client 'today'
    },
    { timestamps: true },
)

export const ScheduleActivity = mongoose.model('ScheduleActivity', scheduleActivitySchema)
