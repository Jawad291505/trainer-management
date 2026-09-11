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
        window.location.href = '/login'
        throw new Error('Session expired')
    }

    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)
    return data
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    put: (path, body) => request('PUT', path, body),
    delete: (path) => request('DELETE', path),
}
