import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = getToken()
        if (!token) { setLoading(false); return }
        api.get('/auth/me')
            .then((data) => setUser(data.user))
            .catch(() => setToken(null))
            .finally(() => setLoading(false))
    }, [])

    const login = useCallback(async (email, password) => {
        const data = await api.post('/auth/login', { email, password })
        setToken(data.token)
        setUser(data.user)
        return data.user
    }, [])

    const logout = useCallback(() => {
        setToken(null)
        setUser(null)
    }, [])

    const refreshUser = useCallback(async () => {
        const data = await api.get('/auth/me')
        setUser(data.user)
    }, [])

    const authed = !!user
    // Trainer profile is nested in the user response
    const trainer = user?.trainer || null

    const value = useMemo(
        () => ({ authed, user, trainer, loading, login, logout, refreshUser }),
        [authed, user, trainer, loading, login, logout, refreshUser],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
