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
}
