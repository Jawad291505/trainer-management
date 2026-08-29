import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { correctionSeed } from '../services/mockData'

const CorrectionsContext = createContext(null)
const STORAGE_KEY = 'fittrack.client.corrections'

function readStored() {
    if (typeof window === 'undefined') return [...correctionSeed]
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return [...correctionSeed]
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [...correctionSeed]
    } catch {
        return [...correctionSeed]
    }
}

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState(readStored)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
        } catch {
            /* storage unavailable — keep working in-memory */
        }
    }, [requests])

    // values: { area, item, type, note }
    const addRequest = useCallback((values) => {
        const entry = {
            id: `RQ-${Date.now()}`,
            area: values.area,
            item: (values.item || '').trim(),
            type: values.type,
            note: values.note.trim(),
            status: 'open',
            reply: '',
            createdAt: new Date().toISOString().slice(0, 10),
            resolvedAt: null,
        }
        setRequests((prev) => [entry, ...prev])
        return entry
    }, [])

    const cancelRequest = useCallback((id) => {
        setRequests((prev) => prev.filter((r) => r.id !== id))
    }, [])

    const openCount = useMemo(() => requests.filter((r) => r.status === 'open').length, [requests])

    const value = useMemo(
        () => ({ requests, addRequest, cancelRequest, openCount }),
        [requests, addRequest, cancelRequest, openCount],
    )

    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

export function useCorrections() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    return ctx
}
