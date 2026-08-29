import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { corrections as seed } from '../services/mockData'

const CorrectionsContext = createContext(null)
const STORAGE_KEY = 'fittrack.trainer.corrections'

function readStored() {
    if (typeof window === 'undefined') return [...seed]
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return [...seed]
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [...seed]
    } catch {
        return [...seed]
    }
}

const today = () => new Date().toISOString().slice(0, 10)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState(readStored)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
        } catch {
            /* storage unavailable — keep working in-memory */
        }
    }, [requests])

    const resolve = useCallback((id, reply) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'resolved', reply: reply.trim(), resolvedAt: today() } : r)),
        )
    }, [])

    const decline = useCallback((id, reply) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'declined', reply: reply.trim(), resolvedAt: today() } : r)),
        )
    }, [])

    const reopen = useCallback((id) => {
        setRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'open', reply: '', resolvedAt: null } : r)),
        )
    }, [])

    const openCount = useMemo(() => requests.filter((r) => r.status === 'open').length, [requests])

    const value = useMemo(
        () => ({ requests, resolve, decline, reopen, openCount }),
        [requests, resolve, decline, reopen, openCount],
    )

    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
