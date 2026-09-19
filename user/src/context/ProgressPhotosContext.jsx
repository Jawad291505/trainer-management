import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useLazyResource, useEnsureLoaded } from '../hooks/useLazyResource'

const ProgressPhotosContext = createContext(null)

// Photos are large (base64 images), so they're only fetched once the Progress
// page's photo section mounts — never as part of the app shell.
export function ProgressPhotosProvider({ children }) {
    const [photos, setPhotos] = useState([])

    const { status, error, ensureLoaded, reload } = useLazyResource(useCallback(async () => {
        const res = await api.get('/progress-photos')
        setPhotos(res.items || [])
    }, []))

    const addPhoto = useCallback(async (data) => {
        const created = await api.post('/progress-photos', data)
        setPhotos((prev) => [created, ...prev])
        return created
    }, [])

    // Photos go browser -> Cloudinary directly (raw file, no base64, not through our
    // API); only the resulting URL is sent to the backend. All photos run in parallel.
    const addPhotos = useCallback(async (rows, opts = {}) => {
        const sign = await api.post('/progress-photos/upload-signatures', { count: rows.length })

        const results = await Promise.allSettled(rows.map(async (row, i) => {
            const { publicId, timestamp, signature } = sign.uploads[i]
            const form = new FormData()
            form.append('file', row.file)
            form.append('api_key', sign.apiKey)
            form.append('timestamp', timestamp)
            form.append('signature', signature)
            form.append('folder', sign.folder)
            form.append('public_id', publicId)

            const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body: form })
            const uploaded = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(uploaded.error?.message || 'Photo upload failed')

            return api.post('/progress-photos', {
                imageUrl: uploaded.secure_url,
                imagePublicId: uploaded.public_id,
                angle: row.angle,
                caption: row.caption || '',
                date: opts.date,
            })
        }))

        const created = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
        // Show whatever was saved (newest first, like the server's ordering) — no
        // need to re-download every photo just to see the ones we just uploaded.
        if (created.length) setPhotos((prev) => [...created.reverse(), ...prev])
        if (!created.length) throw results.find((r) => r.status === 'rejected').reason
        return created.length
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

    const loading = status === 'idle' || status === 'loading'
    const value = useMemo(() => ({
        photos, groupedPhotos, photosByDate: groupedPhotos,
        addPhoto, addPhotos, deletePhoto, removePhoto: deletePhoto, updateCaption,
        loading, error, reload, ensureLoaded,
    }), [photos, groupedPhotos, addPhoto, addPhotos, deletePhoto, updateCaption, loading, error, reload, ensureLoaded])
    return <ProgressPhotosContext.Provider value={value}>{children}</ProgressPhotosContext.Provider>
}

export function useProgressPhotos() {
    const ctx = useContext(ProgressPhotosContext)
    if (!ctx) throw new Error('useProgressPhotos must be used within ProgressPhotosProvider')
    useEnsureLoaded(ctx.ensureLoaded)
    return ctx
}
