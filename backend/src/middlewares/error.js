import { env } from '../config/env.js'

export function notFound(req, _res, next) {
    next({ statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
    let status = err.statusCode || 500
    let message = err.message || 'Internal server error'
    let details = err.details

    // Mongoose / Mongo specifics -> friendly messages.
    if (err.name === 'ValidationError') {
        status = 400
        message = 'Validation failed'
        details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]))
    } else if (err.name === 'CastError') {
        status = 400
        message = `Invalid ${err.path}: ${err.value}`
    } else if (err.code === 11000) {
        status = 409
        message = `Duplicate value for: ${Object.keys(err.keyValue || {}).join(', ')}`
        details = err.keyValue
    } else if (err.name === 'MulterError') {
        status = 400
        message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5MB)' : err.message
    }

    if (status >= 500) console.error('[error]', err)

    res.status(status).json({
        error: message,
        message, // kept alongside `error` — front-end API clients read `.message`
        ...(err.code ? { code: err.code } : {}),
        ...(details ? { details } : {}),
        ...(env.isProd ? {} : { stack: err.stack }),
    })
}
