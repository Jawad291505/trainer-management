import dotenv from 'dotenv'

dotenv.config()

function required(name, fallback) {
    const value = process.env[name] ?? fallback
    if (value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
}

export const env = {
    port: Number(process.env.PORT || 8000),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProd: (process.env.NODE_ENV || 'development') === 'production',

    mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/fittrack'),

    jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    corsOrigins: (process.env.CORS_ORIGINS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),

    seedDemo: String(process.env.SEED_DEMO || 'false').toLowerCase() === 'true',
    seedDemoPassword: process.env.SEED_DEMO_PASSWORD || 'demo1234',

    // ---- Resend (transactional email) ----
    // Unset in dev: invite emails are logged to the console instead of sent,
    // and the temp password is returned in the API response so an admin can
    // hand it over manually. See services/email.service.js.
    resendApiKey: process.env.RESEND_API_KEY || '',
    emailFrom: process.env.EMAIL_FROM || 'FitTrack <onboarding@fittrack.io>',

    // ---- Invitation flow ----
    inviteExpiryDays: Number(process.env.INVITE_EXPIRY_DAYS || 7),
    adminPortalUrl: process.env.ADMIN_PORTAL_URL || 'http://localhost:5173',
    trainerPortalUrl: process.env.TRAINER_PORTAL_URL || 'http://localhost:5174',
    clientPortalUrl: process.env.CLIENT_PORTAL_URL || 'http://localhost:5175',

    // ---- Member self-signup: email OTP ----
    otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 10),

    // ---- Cloudinary (payment-proof screenshot uploads) ----
    // Unset in dev: the upload endpoint fails loudly with a clear error instead
    // of silently accepting files it can't store. See services/cloudinary.service.js.
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',

    // ---- Organization bank/payment details shown on the payment-submission page ----
    bankName: process.env.BANK_NAME || '',
    bankAccountTitle: process.env.BANK_ACCOUNT_TITLE || '',
    bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
    bankIban: process.env.BANK_IBAN || '',
    bankBranch: process.env.BANK_BRANCH || '',
}
