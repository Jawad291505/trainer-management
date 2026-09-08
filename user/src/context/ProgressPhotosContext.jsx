import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { progressPhotoSeed } from '../services/mockData'
import { fileToResizedDataUrl } from '../utils/image'

const ProgressPhotosContext = createContext(null)
const STORAGE_KEY = 'fittrack.client.progressPhotos'

function readStored() {
    if (typeof window === 'undefined') return [...progressPhotoSeed]
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return [...progressPhotoSeed]
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [...progressPhotoSeed]
    } catch {
        return [...progressPhotoSeed]
    }
}

const today = () => new Date().toISOString().slice(0, 10)
const newId = () => `PH-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState(readStored)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
        } catch {
            /* storage full or unavailable — keep working in-memory */
        }
    }, [photos])

    // rows: [{ file, angle, caption }]  — files are resized before storing.
    const addPhotos = useCallback(async (rows, { date } = {}) => {
        const stamp = date || today()
        const entries = []
        for (const row of rows) {
            if (!row?.file) continue
            const dataUrl = await fileToResizedDataUrl(row.file)
            entries.push({
                id: newId(),
                date: stamp,
                dataUrl,
                angle: row.angle || 'other',
                caption: (row.caption || '').trim(),
                note: '',
                noteAt: null,
                createdAt: today(),
            })
        }
        if (entries.length) setPhotos((prev) => [...entries, ...prev])
        return entries.length
    }, [])

    const updateCaption = useCallback((id, caption) => {
        setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption: caption.trim() } : p)))
    }, [])

    const removePhoto = useCallback((id) => {
        setPhotos((prev) => prev.filter((p) => p.id !== id))
    }, [])

    // Newest date first; photos within a day keep insertion order (newest first).
    const photosByDate = useMemo(() => {
        const groups = new Map()
        for (const p of photos) {
            if (!groups.has(p.date)) groups.set(p.date, [])
            groups.get(p.date).push(p)
        }
        return [...groups.entries()]
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([date, items]) => ({ date, items }))
    }, [photos])

    const withNotesCount = useMemo(() => photos.filter((p) => p.note).length, [photos])

    const value = useMemo(
        () => ({ photos, photosByDate, withNotesCount, addPhotos, updateCaption, removePhoto }),
        [photos, photosByDate, withNotesCount, addPhotos, updateCaption, removePhoto],
    )

    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    return ctx
}
