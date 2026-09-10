// Small typed error so controllers can throw and the error middleware can map it
// to a clean JSON response with the right status code.
export default class ApiError extends Error {
    constructor(statusCode, message, details) {
        super(message)
        this.statusCode = statusCode
        this.details = details
        this.isApiError = true
        Error.captureStackTrace?.(this, this.constructor)
    }

    static badRequest(msg = 'Bad request', details) {
        return new ApiError(400, msg, details)
    }
    static unauthorized(msg = 'Not authenticated') {
        return new ApiError(401, msg)
    }
    static forbidden(msg = 'Not allowed') {
        return new ApiError(403, msg)
    }
    static notFound(msg = 'Not found') {
        return new ApiError(404, msg)
    }
    static conflict(msg = 'Conflict', details) {
        return new ApiError(409, msg, details)
    }
}
