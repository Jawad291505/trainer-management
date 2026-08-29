import { createContext, useContext, useCallback, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'fittrack.admin.auth'

// Lightweight demo auth — no backend. Persists a signed-in flag so a refresh
// keeps you in the app; the login screen accepts the prefilled demo details.
export function AuthProvider({ children }) {
    const [authed, setAuthed] = useState(() => {
        if (typeof window === 'undefined') return false
        try {
            return localStorage.getItem(STORAGE_KEY) === '1'
        } catch {
            return false
        }
    })

    const login = useCallback(() => {
        try {
            localStorage.setItem(STORAGE_KEY, '1')
        } catch {
            /* ignore */
        }
        setAuthed(true)
    }, [])

    const logout = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY)
        } catch {
            /* ignore */
        }
        setAuthed(false)
    }, [])

    const value = useMemo(() => ({ authed, login, logout }), [authed, login, logout])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
