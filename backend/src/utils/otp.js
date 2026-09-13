import crypto from 'crypto'
import { hashPassword, comparePassword } from './password.js'
import { env } from '../config/env.js'

// 6-digit numeric OTP for email verification (Member self-signup). Hashed with
// the same bcrypt helper as passwords before it ever touches the database —
// only the plaintext code that goes out in the email is ever readable.
export function generateOtp() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, '0')
}

export const hashOtp = (otp) => hashPassword(otp)
export const compareOtp = (otp, hash) => comparePassword(otp, hash)

export function otpExpiryDate() {
    return new Date(Date.now() + env.otpExpiryMinutes * 60 * 1000)
}
