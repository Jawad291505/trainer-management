import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const CorrectionsContext = createContext(null)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState([])

    useEffect(() => {
        if (!getToken()) return
        api.get('/corrections').then((res) => setRequests(res.items || [])).catch(() => { })
    }, [])

    const addRequest = useCallback(async (data) => {
        const created = await api.post('/corrections', data)
        setRequests((prev) => (prev.some((r) => r.id === created.id) ? prev : [created, ...prev]))
        return created
    }, [])

    const cancelRequest = useCallback(async (id) => {
        await api.delete(`/corrections/${id}`)
        setRequests((prev) => prev.filter((r) => (r._id || r.id) !== id))
    }, [])

    const openCount = useMemo(() => requests.filter((r) => r.status === 'pending' || r.status === 'open').length, [requests])

    const value = useMemo(() => ({ requests, addRequest, cancelRequest, openCount }), [requests, addRequest, cancelRequest, openCount])
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
