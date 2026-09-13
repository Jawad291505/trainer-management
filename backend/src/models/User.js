import mongoose from 'mongoose'
import { ROLE_VALUES, ACCOUNT_STATUS } from '../config/constants.js'

// Identity + auth for every human on the platform. The admin "Users" page
// (admin/src/portals/admin/pages/Users.jsx) unifies admins, trainers and
// clients into one list — this is that list. Role-specific attributes live on
// the Trainer / Client profile documents which reference this one.
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: { type: String, required: true, select: false },
        role: { type: String, enum: ROLE_VALUES, required: true, index: true },
        status: { type: String, enum: ACCOUNT_STATUS, default: 'active', index: true },

        // Invitation flow (Admin/Member/Trainer/Client are all provisioned the
        // same way — see services/invite.service.js). true until the user sets
        // their own password on first login; the temp password stops working
        // (account-wise) once that happens, and outright expires after
        // tempPasswordExpires regardless.
        mustChangePassword: { type: Boolean, default: false },
        tempPasswordExpires: { type: Date, default: null },

        // Email OTP verification — only meaningful for self-signup (Member
        // signup flow, controllers/memberSignup.controller.js). Accounts
        // provisioned by an admin/Super Admin are trusted and default verified.
        emailVerified: { type: Boolean, default: true },
        otpCodeHash: { type: String, select: false },
        otpExpires: { type: Date, select: false },

        // Cosmetic — every front-end renders a coloured avatar (UserAvatar.jsx).
        avatarColor: { type: String, default: '#0b2545' },
        phone: { type: String, trim: true },

        joinDate: { type: Date, default: Date.now },
        lastActivity: { type: Date, default: Date.now },
    },
    { timestamps: true },
)

userSchema.set('toJSON', {
    virtuals: true,
    transform(_doc, ret) {
        delete ret.passwordHash
        delete ret.__v
        return ret
    },
})

export const User = mongoose.model('User', userSchema)
