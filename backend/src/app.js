import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { env } from './config/env.js'
import api from './routes/index.js'
import { notFound, errorHandler } from './middlewares/error.js'

export function createApp() {
    const app = express()

    app.use(
        cors({
            origin(origin, cb) {
                // Allow tools with no Origin (curl / Postman) and any configured front-end.
                if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) {
                    return cb(null, true)
                }
                return cb(new Error(`Origin not allowed by CORS: ${origin}`))
            },
            credentials: true,
        }),
    )

    // Diet-plan / progress-photo payloads carry base64 data URLs — bump the limit.
    app.use(express.json({ limit: '8mb' }))
    app.use(express.urlencoded({ extended: true }))
    if (!env.isProd) app.use(morgan('dev'))

    app.get('/', (_req, res) => res.json({ service: 'fittrack-backend', docs: '/api/health' }))
    app.use('/api', api)

    app.use(notFound)
    app.use(errorHandler)

    return app
}
