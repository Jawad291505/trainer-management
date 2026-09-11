import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const ProgressPhotosContext = createContext(null)

export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState([])

    useEffect(() => {
        if (!getToken()) return
        api.get('/progress-photos').then((res) => setPhotos(res.items || [])).catch(() => { })
    }, [])

    const addPhoto = useCallback(async (data) => {
        const created = await api.post('/progress-photos', data)
        setPhotos((prev) => [created, ...prev])
        return created
    }, [])

    const addPhotos = useCallback(async (rows, opts = {}) => {
        let count = 0
        for (const row of rows) {
            const reader = new FileReader()
            const dataUrl = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result)
                reader.readAsDataURL(row.file)
            })
            await api.post('/progress-photos', {
                image: dataUrl,
                angle: row.angle,
                caption: row.caption || '',
                date: opts.date,
            })
            count++
        }
        // Refresh the full list
        try {
            const res = await api.get('/progress-photos')
            setPhotos(res.items || [])
        } catch { /* */ }
        return count
    }, [])

    const deletePhoto = useCallback(async (id) => {
        await api.delete(`/progress-photos/${id}`)
        setPhotos((prev) => prev.filter((p) => (p._id || p.id) !== id))
    }, [])

    const updateCaption = useCallback(async (id, caption) => {
        await api.patch(`/progress-photos/${id}`, { caption })
        setPhotos((prev) => prev.map((p) => ((p._id || p.id) === id ? { ...p, caption } : p)))
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

    const value = useMemo(() => ({
        photos, groupedPhotos, photosByDate: groupedPhotos,
        addPhoto, addPhotos, deletePhoto, removePhoto: deletePhoto, updateCaption,
    }), [photos, groupedPhotos, addPhoto, addPhotos, deletePhoto, updateCaption])
    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    return ctx
}
