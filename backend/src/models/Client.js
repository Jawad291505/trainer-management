import mongoose from 'mongoose'
import { CLIENT_GOALS, CLIENT_GENDERS, MEMBERSHIP_PLANS, ACCOUNT_STATUS, PROGRAMME_MAX_DAYS } from '../config/constants.js'
import { programmeOf } from '../services/programme.service.js'

// Client profile. One-to-one with a User (role: 'client').
// Fields mirror admin/trainer/user mockData.js client objects + currentClient.
const clientSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

        // Assignment. `null` == unassigned (admin Assignments page allows this).
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },

        // Consultation goal. Presets come from CLIENT_GOALS but "Other" lets a
        // trainer/admin type a custom one, so this is a free string, not an enum.
        goal: { type: String, default: CLIENT_GOALS[0], trim: true },
        // Legacy membership tier — no longer shown or chosen anywhere; kept so
        // old records (and Payment rows that reference it) stay valid.
        plan: { type: String, enum: MEMBERSHIP_PLANS, default: 'Starter' },

        // Programme: a length in days counted from a start date. Both are null
        // for clients added before programmes existed (no programme yet). End
        // date, current day, days left and status are derived — see
        // services/programme.service.js.
        programDays: { type: Number, default: null, min: 1, max: PROGRAMME_MAX_DAYS },
        programStart: { type: Date, default: null },
        // Which "ending soon" / "ended" notices have gone out for the current
        // programme; reset whenever its length or start date changes.
        programReminders: {
            endingSoon: { type: Boolean, default: false },
            ended: { type: Boolean, default: false },
        },
        status: { type: String, enum: ACCOUNT_STATUS, default: 'active', index: true },

        // Optional personal details captured when the client is added (phone
        // lives on the User doc). Age in years, height in centimetres.
        age: { type: Number, default: null, min: 1, max: 120 },
        height: { type: Number, default: null, min: 50, max: 300 },
        // 'male' | 'female' | null. Optional — clients added before this existed
        // simply have none (and so no BMR until it is filled in).
        gender: { type: String, enum: [...CLIENT_GENDERS, null], default: null },
        medicalNotes: { type: String, default: '', trim: true, maxlength: 2000 },

        // Weight tracking (user MyProgress: weightLost = startWeight - weight,
        // toGoal = weight - target). Kilograms.
        startWeight: { type: Number, default: null },
        weight: { type: Number, default: null },
        target: { type: Number, default: null },

        // 0-100 goal-completion percentage shown on every client card / table.
        progress: { type: Number, default: 0, min: 0, max: 100 },

        // Daily water intake target in litres, set by the trainer.
        waterGoal: { type: Number, default: 2, min: 0 },

        // Daily sleep target in hours, set by the trainer.
        sleepGoal: { type: Number, default: 8, min: 0 },

        joinDate: { type: Date, default: Date.now },
        lastFollowUp: { type: Date, default: null },
        nextFollowUp: { type: Date, default: null },
    },
    { timestamps: true },
)

// Derived programme summary, included wherever a Client is serialised whole
// (e.g. GET /api/auth/me for the client app).
clientSchema.virtual('programme').get(function () {
    return programmeOf(this)
})

clientSchema.set('toJSON', { virtuals: true })

export const Client = mongoose.model('Client', clientSchema)
