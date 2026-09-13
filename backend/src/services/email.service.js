import { Resend } from 'resend'
import { env } from '../config/env.js'

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null

const PORTAL_URL = {
    admin: env.adminPortalUrl,
    member: env.adminPortalUrl, // Members use the same Admin portal.
    trainer: env.trainerPortalUrl,
    client: env.clientPortalUrl,
}

const ROLE_LABEL = { admin: 'Admin', member: 'Member', trainer: 'Trainer', client: 'Client' }

function inviteEmailHtml({ name, email, tempPassword, portalUrl, roleLabel }) {
    return `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#0b2545;">Welcome to FitTrack, ${name}</h2>
            <p>An account has been created for you as a <strong>${roleLabel}</strong>. Use the temporary credentials below to sign in and set your own password.</p>
            <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
                <tr><td style="padding:8px 0; color:#64748b;">Login email</td><td style="padding:8px 0; font-weight:600;">${email}</td></tr>
                <tr><td style="padding:8px 0; color:#64748b;">Temporary password</td><td style="padding:8px 0; font-weight:600; font-family: monospace;">${tempPassword}</td></tr>
            </table>
            <p><a href="${portalUrl}" style="display:inline-block; background:#0b2545; color:#fff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600;">Open the portal</a></p>
            <p style="color:#64748b; font-size:13px;">For your security, you'll be asked to set a new password the first time you log in. This temporary password expires in ${env.inviteExpiryDays} days.</p>
        </div>
    `.trim()
}

// Sends an invite email via Resend. In dev (no RESEND_API_KEY configured) this
// logs to the console instead of throwing, so account creation never blocks
// on email delivery — callers should still surface `sent: false` to the admin.
export async function sendInviteEmail({ to, name, tempPassword, role }) {
    const portalUrl = PORTAL_URL[role] || env.adminPortalUrl
    const roleLabel = ROLE_LABEL[role] || role
    const subject = `Your FitTrack ${roleLabel} account is ready`
    const html = inviteEmailHtml({ name, email: to, tempPassword, portalUrl, roleLabel })

    if (!resend) {
        console.warn(`[email] RESEND_API_KEY not set — invite for ${to} not sent. Temp password: ${tempPassword}`)
        return { sent: false, reason: 'Email is not configured (RESEND_API_KEY missing) — share the temporary password manually.' }
    }

    const { error } = await resend.emails.send({
        from: env.emailFrom,
        to,
        subject,
        html,
    })
    if (error) {
        console.error('[email] Resend failed to send invite:', error)
        return { sent: false, reason: error.message || 'Resend failed to send the invite email.' }
    }
    return { sent: true, reason: null }
}

function otpEmailHtml({ name, otp }) {
    return `
        <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color:#0b2545;">Verify your email</h2>
            <p>Hi ${name}, use the code below to verify your email and continue setting up your FitTrack Member account.</p>
            <div style="font-size:32px; font-weight:800; letter-spacing:8px; text-align:center; background:#f1f5f9; border-radius:12px; padding:20px; margin:24px 0; color:#0b2545;">${otp}</div>
            <p style="color:#64748b; font-size:13px;">This code expires in ${env.otpExpiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>
        </div>
    `.trim()
}

// Sends the Member self-signup OTP. Same dev-fallback behaviour as invite
// emails: logs the code instead of throwing when Resend isn't configured.
export async function sendOtpEmail({ to, name, otp }) {
    if (!resend) {
        console.warn(`[email] RESEND_API_KEY not set — OTP for ${to} not sent. Code: ${otp}`)
        return { sent: false, reason: 'Email is not configured (RESEND_API_KEY missing).' }
    }

    const { error } = await resend.emails.send({
        from: env.emailFrom,
        to,
        subject: 'Your FitTrack verification code',
        html: otpEmailHtml({ name, otp }),
    })
    if (error) {
        console.error('[email] Resend failed to send OTP:', error)
        return { sent: false, reason: error.message || 'Resend failed to send the verification code.' }
    }
    return { sent: true, reason: null }
}
