import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { progressPhotos as seed } from '../services/mockData'

const ProgressPhotosContext = createContext(null)
const STORAGE_KEY = 'fittrack.trainer.progressPhotos'

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

export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState(readStored)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
        } catch {
            /* storage unavailable — keep working in-memory */
        }
    }, [photos])

    const setNote = useCallback((id, note) => {
        setPhotos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, note: note.trim(), noteAt: today() } : p)),
        )
    }, [])

    const clearNote = useCallback((id) => {
        setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, note: '', noteAt: null } : p)))
    }, [])

    // Photos for one client, grouped by date (newest date first).
    const photosForClient = useCallback(
        (clientId) => {
            const groups = new Map()
            for (const p of photos) {
                if (p.clientId !== clientId) continue
                if (!groups.has(p.date)) groups.set(p.date, [])
                groups.get(p.date).push(p)
            }
            return [...groups.entries()]
                .sort((a, b) => (a[0] < b[0] ? 1 : -1))
                .map(([date, items]) => ({ date, items }))
        },
        [photos],
    )

    const pendingCountForClient = useCallback(
        (clientId) => photos.filter((p) => p.clientId === clientId && !p.note).length,
        [photos],
    )

    const value = useMemo(
        () => ({ photos, setNote, clearNote, photosForClient, pendingCountForClient }),
        [photos, setNote, clearNote, photosForClient, pendingCountForClient],
    )

    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    return ctx
}
