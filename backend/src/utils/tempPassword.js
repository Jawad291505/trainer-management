import crypto from 'crypto'

// Unambiguous charset (no 0/O/1/l/I) — these land in an email, so they need to
// be easy to read and re-type on a first login.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'

// Cryptographically-random temporary password for admin-provisioned accounts
// (Admin, Member, Trainer, Client invites — see services/invite.service.js).
export function generateTempPassword(length = 12) {
    const bytes = crypto.randomBytes(length)
    let out = ''
    for (let i = 0; i < length; i += 1) out += CHARS[bytes[i] % CHARS.length]
    return out
}
