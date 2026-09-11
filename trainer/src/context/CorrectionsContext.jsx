import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const CorrectionsContext = createContext(null)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState([])

    useEffect(() => {
        if (!getToken()) return
        api.get('/corrections').then((res) => setRequests(res.items || [])).catch(() => { })
    }, [])

    const respond = useCallback(async (id, reply, status = 'resolved') => {
        const updated = await api.patch(`/corrections/${id}`, { reply, status })
        setRequests((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)))
    }, [])

    const resolve = useCallback(async (id, reply) => {
        const updated = await api.patch(`/corrections/${id}`, { reply, status: 'resolved' })
        setRequests((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)))
    }, [])

    const decline = useCallback(async (id, reply) => {
        const updated = await api.patch(`/corrections/${id}`, { reply, status: 'declined' })
        setRequests((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)))
    }, [])

    const reopen = useCallback(async (id) => {
        const updated = await api.patch(`/corrections/${id}`, { status: 'open' })
        setRequests((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)))
    }, [])

    const openCount = useMemo(() => requests.filter((r) => r.status === 'pending' || r.status === 'open').length, [requests])

    const value = useMemo(() => ({ requests, respond, resolve, decline, reopen, openCount }), [requests, respond, resolve, decline, reopen, openCount])
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
