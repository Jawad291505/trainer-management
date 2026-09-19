import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const CorrectionsContext = createContext(null)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState([])

    useEffect(() => {
        if (!getToken()) return
        api.get('/corrections').then((res) => setRequests(res.items || [])).catch(() => { })
    }, [])

    // PATCH /corrections/:id { action } and swap the returned request into state.
    // Rejects with the API error so callers can show it (e.g. PLAN_NOT_CHANGED).
    const act = useCallback(async (id, body) => {
        const updated = await api.patch(`/corrections/${id}`, body)
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
        return updated
    }, [])

    const resolve = useCallback((id, reply, { withoutChange = false } = {}) => act(id, { action: 'resolve', reply, withoutChange }), [act])
    const decline = useCallback((id, reply) => act(id, { action: 'decline', reply }), [act])
    const reopen = useCallback((id) => act(id, { action: 'reopen' }), [act])
    // Best-effort and idempotent: stamps "seen" the first time only.
    const markSeen = useCallback((id) => act(id, { action: 'seen' }).catch(() => { }), [act])

    const openCount = useMemo(() => requests.filter((r) => r.status === 'open').length, [requests])

    const value = useMemo(
        () => ({ requests, resolve, decline, reopen, markSeen, openCount }),
        [requests, resolve, decline, reopen, markSeen, openCount],
    )
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
