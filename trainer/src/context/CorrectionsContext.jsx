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

    // The full list is only fetched when a page that shows it (Requests, ClientProfile) mounts.
    const { status, error, ensureLoaded, reload } = useLazyResource(useCallback(async () => {
        const res = await api.get('/corrections')
        setRequests(res.items || [])
    }, []))
    const loaded = status === 'ready'

    // PATCH /corrections/:id { action } and swap the returned request into state.
    // Rejects with the API error so callers can show it (e.g. PLAN_NOT_CHANGED).
    const act = useCallback(async (id, body) => {
        const updated = await api.patch(`/corrections/${id}`, body)
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)))
        return updated
    }, [])

    const resolve = useCallback((id, reply, { withoutChange = false } = {}) => act(id, { action: 'resolve', reply, withoutChange }), [act])
    const decline = useCallback((id, reply) => act(id, { action: 'decline', reply }), [act])
    const reopen = useCallback((id) => act(id, { action: 'reopen' }), [act])
    // Best-effort and idempotent: stamps "seen" the first time only.
    const markSeen = useCallback((id) => act(id, { action: 'seen' }).catch(() => { }), [act])

    // Once the list is loaded it is the source of truth (resolve/decline/reopen update it live).
    const openCount = useMemo(
        () => (loaded ? requests.filter((r) => r.status === 'open').length : summaryCount),
        [loaded, requests, summaryCount],
    )

    const loading = status === 'idle' || status === 'loading'
    const value = useMemo(
        () => ({ requests, resolve, decline, reopen, markSeen, openCount, loaded, loading, error, reload, ensureLoaded }),
        [requests, resolve, decline, reopen, markSeen, openCount, loaded, loading, error, reload, ensureLoaded],
    )
    return <CorrectionsContext.Provider value={value}>{children}</CorrectionsContext.Provider>
}

// Full request list — loads it on first use. Pass { load: false } to read
// whatever is already loaded (`loaded` says whether that's the full list)
// without triggering the fetch.
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
