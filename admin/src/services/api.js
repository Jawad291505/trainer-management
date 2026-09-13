// Centralized API client for the admin portal.
// Every service file calls these helpers instead of fetch() directly.

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'fittrack.admin.token'

export function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
}

async function request(method, path, body, { isFormData } = {}) {
    const headers = {}
    if (!isFormData) headers['Content-Type'] = 'application/json'
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    })

    if (res.status === 401) {
        setToken(null)
        if (window.location.pathname !== '/login') {
            window.location.href = '/login'
        }
        throw new Error('Session expired')
    }

    const data = await res.json().catch(() => ({}))

    // Temp-password accounts are locked out of everything except /auth/me until
    // they set a real password (see backend middlewares/auth.js). Bounce there
    // instead of surfacing a confusing 403 on whatever call triggered it.
    if (res.status === 403 && data.code === 'PASSWORD_CHANGE_REQUIRED' && window.location.pathname !== '/set-password') {
        window.location.href = '/set-password'
        throw new Error(data.message || 'You must set a new password before continuing')
    }

    // Self-signup Member mid-onboarding hit something outside their allowed
    // flow — bounce to "/" and let AppRoutes figure out which onboarding step
    // (OTP / plan / payment / pending) they belong on from their fresh profile.
    if (res.status === 403 && data.code === 'MEMBER_PENDING_APPROVAL' && window.location.pathname !== '/') {
        window.location.href = '/'
        throw new Error(data.message || 'Your account is pending approval')
    }

    if (!res.ok) {
        const err = new Error(data.message || data.error || `Request failed (${res.status})`)
        err.code = data.code
        err.status = res.status
        throw err
    }
    return data
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, formData, { isFormData: true }),
}
