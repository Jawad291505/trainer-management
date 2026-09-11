import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const CorrectionsContext = createContext(null)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState([])

    useEffect(() => {
        api.get('/corrections').then((res) => setRequests(res.items || [])).catch(() => { })
    }, [])

    const respond = useCallback(async (id, reply, status = 'resolved') => {
        const updated = await api.patch(`/corrections/${id}`, { reply, status })
        setRequests((prev) => prev.map((r) => ((r._id || r.id) === id ? updated : r)))
    }, [])

    const value = useMemo(() => ({ requests, respond }), [requests, respond])
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
