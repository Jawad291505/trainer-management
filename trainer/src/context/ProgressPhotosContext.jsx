import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const ProgressPhotosContext = createContext(null)

export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState([])

    useEffect(() => {
        api.get('/progress-photos').then((res) => setPhotos(res.items || [])).catch(() => { })
    }, [])

    const photosForClient = useCallback((clientId) => {
        const mine = photos.filter((p) => String(p.client) === String(clientId) || String(p.clientId) === String(clientId))
        const groups = new Map()
        mine.forEach((p) => {
            const d = (p.date || p.createdAt || '').slice(0, 10)
            if (!groups.has(d)) groups.set(d, { date: d, items: [] })
            groups.get(d).items.push(p)
        })
        return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date))
    }, [photos])

    const pendingCountForClient = useCallback((clientId) => {
        return photos.filter((p) => (String(p.client) === String(clientId) || String(p.clientId) === String(clientId)) && !p.note).length
    }, [photos])

    const setNote = useCallback(async (photoId, note) => {
        await api.patch(`/progress-photos/${photoId}/note`, { note })
        setPhotos((prev) => prev.map((p) => ((p._id || p.id) === photoId ? { ...p, note, noteAt: new Date().toISOString() } : p)))
    }, [])

    const clearNote = useCallback(async (photoId) => {
        await api.patch(`/progress-photos/${photoId}/note`, { note: '' })
        setPhotos((prev) => prev.map((p) => ((p._id || p.id) === photoId ? { ...p, note: '', noteAt: null } : p)))
    }, [])

    const value = useMemo(() => ({ photos, photosForClient, pendingCountForClient, setNote, clearNote }), [photos, photosForClient, pendingCountForClient, setNote, clearNote])
    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    return ctx
}
