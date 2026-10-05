import { useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useAsyncData } from './useAsyncData'

// Union of category lists — first-seen order, case-insensitive de-dupe.
export function mergeCategories(...lists) {
    const seen = new Set()
    const out = []
    for (const name of lists.flat()) {
        const key = String(name || '').trim().toLowerCase()
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push(String(name).trim())
    }
    return out
}

// Category list for the food / exercise library pages.
//
// `base` is the built-in list from the shared JSON (always present, so the
// pickers still work if the request fails); the API adds every category created
// since. `addCategory` stages a brand-new name for the form — it is only stored
// once an item using it is saved (the backend registers it then).
//
//   kind: 'foods' | 'exercises'
export function useLibraryCategories(kind, base) {
    const res = useAsyncData(() => api.get(`/${kind}/categories`, { ttl: 60_000 }), [kind])
    const [staged, setStaged] = useState([])

    const saved = useMemo(() => mergeCategories(base, res.data?.categories || []), [base, res.data])
    const categories = useMemo(() => mergeCategories(saved, staged), [saved, staged])

    // Returns the name to select: the existing spelling if it's already there.
    const addCategory = useCallback((name) => {
        const clean = String(name || '').trim().replace(/\s+/g, ' ')
        if (!clean) return null
        const existing = categories.find((c) => c.toLowerCase() === clean.toLowerCase())
        if (existing) return existing
        setStaged((prev) => [...prev, clean])
        return clean
    }, [categories])

    return { categories, saved, addCategory, reload: res.reload }
}
