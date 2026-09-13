import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User } from '../models/index.js'
import { createInvitedUser } from '../services/invite.service.js'

function flatten(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatarColor: user.avatarColor,
        status: user.status,
        joinDate: user.joinDate,
    }
}

// POST /api/admins   (admin only) — invite another Super Admin via the shared
// invite flow (temp password emailed through Resend).
export const createAdmin = asyncHandler(async (req, res) => {
    const { name, email } = req.body
    if (!name || !email) throw ApiError.badRequest('name and email are required')
    if (await User.exists({ email: email.toLowerCase() })) throw ApiError.conflict('Email already in use')

    const { user, tempPassword, inviteSent, inviteWarning } = await createInvitedUser({
        name,
        email,
        role: 'admin',
        avatarColor: req.body.avatarColor,
    })
    res.status(201).json({
        ...flatten(user),
        ...(inviteSent ? {} : { inviteWarning, tempPassword }),
    })
})
