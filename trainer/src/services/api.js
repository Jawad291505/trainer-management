const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'fittrack.trainer.token'

export function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
}

async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
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
}
