import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'
import { useLazyResource, useEnsureLoaded } from '../hooks/useLazyResource'

const CorrectionsContext = createContext(null)

export function CorrectionsProvider({ children }) {
    const [requests, setRequests] = useState([])
    // Sidebar badge: a lightweight count so no page has to load the whole list for it.
    const [summaryCount, setSummaryCount] = useState(0)

    useEffect(() => {
        if (!getToken()) return
        api.get('/corrections?summary=1').then((res) => setSummaryCount(res.openCount || 0)).catch(() => { })
    }, [])

    // The full list is only fetched when a page that shows it (My Requests) mounts.
    const { status, error, ensureLoaded, reload } = useLazyResource(useCallback(async () => {
        const res = await api.get('/corrections')
        setRequests(res.items || [])
    }, []))
    const loaded = status === 'ready'

    const addRequest = useCallback(async (data) => {
        const created = await api.post('/corrections', data)
        setRequests((prev) => (prev.some((r) => r.id === created.id) ? prev : [created, ...prev]))
        // Keep the badge right even if the full list hasn't been loaded.
        setSummaryCount((n) => n + 1)
        return created
    }, [])

    const cancelRequest = useCallback(async (id) => {
        await api.delete(`/corrections/${id}`)
        setRequests((prev) => prev.filter((r) => (r._id || r.id) !== id))
    }, [])

    // Once the list is loaded it is the source of truth; until then the cheap summary count.
    const openCount = useMemo(
        () => (loaded ? requests.filter((r) => r.status === 'pending' || r.status === 'open').length : summaryCount),
        [loaded, requests, summaryCount],
    )

    const loading = status === 'idle' || status === 'loading'
    const value = useMemo(
        () => ({ requests, addRequest, cancelRequest, openCount, loaded, loading, error, reload, ensureLoaded }),
        [requests, addRequest, cancelRequest, openCount, loaded, loading, error, reload, ensureLoaded],
    )
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

// Full request list — loads it on first use. Pass { load: false } for actions
// only (e.g. submitting a request) without triggering the list fetch.
export function useCorrections({ load = true } = {}) {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrections must be used within CorrectionsProvider')
    useEnsureLoaded(...(load ? [ctx.ensureLoaded] : []))
    return ctx
}

// Just the open-request count (sidebar badge) — never triggers the list fetch.
export function useCorrectionsBadge() {
    const ctx = useContext(CorrectionsContext)
    if (!ctx) throw new Error('useCorrectionsBadge must be used within CorrectionsProvider')
    return ctx.openCount
}
