const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const TOKEN_KEY = 'fittrack.client.token'

export function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export function setToken(t) {
    try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
    clearCache()
}

// ---- GET dedup + opt-in cache ------------------------------------------------
// Identical GETs that are in flight at the same time (StrictMode double effects,
// several components asking for the same list) share one network request.
// Callers may also pass { ttl } (ms) for slow-changing reference data; cached
// responses are dropped on any write (POST/PATCH/PUT/DELETE) and on token change.
// Every caller gets its own copy, so mutating a result can't corrupt the cache.
const inflight = new Map()
const cache = new Map()

function clearCache() {
    cache.clear()
    inflight.clear()
}

const copy = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : v)

function cachedGet(path, { ttl = 0, force = false } = {}) {
    if (!force && ttl > 0) {
        const hit = cache.get(path)
        if (hit && hit.expires > Date.now()) return Promise.resolve(copy(hit.data))
    }
    let pending = inflight.get(path)
    if (!pending) {
        pending = request('GET', path)
            .then((data) => {
                if (ttl > 0 && inflight.get(path) === pending) cache.set(path, { data, expires: Date.now() + ttl })
                return data
            })
            .finally(() => { if (inflight.get(path) === pending) inflight.delete(path) })
        inflight.set(path, pending)
    }
    return pending.then(copy)
}

// Writes invalidate everything cached — cheap, and never serves stale data after a change.
async function write(method, path, body, opts) {
    try {
        return await request(method, path, body, opts)
    } finally {
        clearCache()
    }
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
    // get(path, { ttl, force }) — see the GET dedup + cache notes above.
    get: (path, opts) => cachedGet(path, opts),
    post: (path, body) => write('POST', path, body),
    patch: (path, body) => write('PATCH', path, body),
    put: (path, body) => write('PUT', path, body),
    delete: (path) => write('DELETE', path),
}
