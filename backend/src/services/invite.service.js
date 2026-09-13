import { User } from '../models/index.js'
import { hashPassword } from '../utils/password.js'
import { generateTempPassword } from '../utils/tempPassword.js'
import { sendInviteEmail } from './email.service.js'
import { env } from '../config/env.js'

function expiryDate() {
    return new Date(Date.now() + env.inviteExpiryDays * 24 * 60 * 60 * 1000)
}

// Single reusable "invite" flow shared by Admin, Member, Trainer and Client
// creation (and by resend-invite): generate a temp password, store only its
// hash, mark the account as requiring a password change, and email it via
// Resend. Callers create the role-specific profile doc (Trainer/Client/Member)
// themselves — this only owns the User + the credential lifecycle.
export async function createInvitedUser({ name, email, role, avatarColor, status = 'active' }) {
    const tempPassword = generateTempPassword()
    const user = await User.create({
        name,
        email,
        role,
        avatarColor,
        status,
        passwordHash: await hashPassword(tempPassword),
        mustChangePassword: true,
        tempPasswordExpires: expiryDate(),
    })

    const { sent, reason } = await sendInviteEmail({ to: user.email, name: user.name, tempPassword, role })
    return { user, tempPassword, inviteSent: sent, inviteWarning: reason }
}

// Re-issue a fresh temp password for an existing account (expired/lost
// invite, or "resend invite" from the admin Users table).
export async function reissueInvite(user) {
    const tempPassword = generateTempPassword()
    user.passwordHash = await hashPassword(tempPassword)
    user.mustChangePassword = true
    user.tempPasswordExpires = expiryDate()
    await user.save()

    const { sent, reason } = await sendInviteEmail({ to: user.email, name: user.name, tempPassword, role: user.role })
    return { tempPassword, inviteSent: sent, inviteWarning: reason }
}
