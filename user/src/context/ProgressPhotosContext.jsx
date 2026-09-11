import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const ProgressPhotosContext = createContext(null)

export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState([])

    useEffect(() => {
        api.get('/progress-photos').then((res) => setPhotos(res.items || [])).catch(() => { })
    }, [])

    const addPhoto = useCallback(async (data) => {
        const created = await api.post('/progress-photos', data)
        setPhotos((prev) => [created, ...prev])
        return created
    }, [])

    const deletePhoto = useCallback(async (id) => {
        await api.delete(`/progress-photos/${id}`)
        setPhotos((prev) => prev.filter((p) => (p._id || p.id) !== id))
    }, [])

    // Group photos by date for display
    const groupedPhotos = useMemo(() => {
        const groups = new Map()
        photos.forEach((p) => {
            const d = (p.date || p.createdAt || '').slice(0, 10)
            if (!groups.has(d)) groups.set(d, { date: d, items: [] })
            groups.get(d).items.push(p)
        })
        return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date))
    }, [photos])

    const value = useMemo(() => ({ photos, groupedPhotos, addPhoto, deletePhoto }), [photos, groupedPhotos, addPhoto, deletePhoto])
    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    return ctx
}
