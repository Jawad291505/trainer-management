// Small typed error so controllers can throw and the error middleware can map it
// to a clean JSON response with the right status code.
export default class ApiError extends Error {
    constructor(statusCode, message, details, code) {
        super(message)
        this.statusCode = statusCode
        this.details = details
        this.code = code
        this.isApiError = true
        Error.captureStackTrace?.(this, this.constructor)
    }

    static badRequest(msg = 'Bad request', details) {
        return new ApiError(400, msg, details)
    }
    static unauthorized(msg = 'Not authenticated', code) {
        return new ApiError(401, msg, undefined, code)
    }
    static forbidden(msg = 'Not allowed', code) {
        return new ApiError(403, msg, undefined, code)
    }
    // Thrown by authenticate() when a temp-password account tries to reach
    // anything other than /auth/me — forces the front-end to the "set a new
    // password" screen before it can do anything else.
    static passwordChangeRequired() {
        return new ApiError(403, 'You must set a new password before continuing', undefined, 'PASSWORD_CHANGE_REQUIRED')
    }
    // Thrown by authenticate() when a self-signup Member (status 'pending') tries
    // to reach anything outside the signup/onboarding flow — front-end redirects
    // to whichever onboarding step Member.onboardingStage says they're on.
    static memberPendingApproval() {
        return new ApiError(403, 'Your account is pending approval', undefined, 'MEMBER_PENDING_APPROVAL')
    }
    static notFound(msg = 'Not found') {
        return new ApiError(404, msg)
    }
    static conflict(msg = 'Conflict', details) {
        return new ApiError(409, msg, details)
    }
}
