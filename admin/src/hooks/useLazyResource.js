import { useCallback, useEffect, useRef, useState } from 'react'

// Load-on-first-use for context data. A provider owns the state, but nothing is
// fetched until a component that needs it actually mounts and calls
// `ensureLoaded()` — so pages never pay for data they don't show.
//
//   status: 'idle' | 'loading' | 'ready' | 'error'
//   ensureLoaded(): loads on the first call; afterwards a no-op — except that data older
//                   than `staleMs` is quietly refreshed in the background (the current data
//                   stays on screen, no spinner), so revisiting a page isn't stuck on old data.
//                   Safe to call from many components / StrictMode.
//   reload(): force a refetch (e.g. a "Retry" button)
export function useLazyResource(fetcher, { staleMs = 30_000 } = {}) {
    const [status, setStatus] = useState('idle')
    const [error, setError] = useState(null)
    const started = useRef(false)
    const loadedAt = useRef(0)
    const refreshing = useRef(false)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const run = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setStatus('loading')
            setError(null)
        }
        try {
            await fetcherRef.current()
            loadedAt.current = Date.now()
            setStatus('ready')
        } catch (err) {
            if (silent) return // keep showing what we have
            started.current = false
            setError(err)
            setStatus('error')
        }
    }, [])

    const ensureLoaded = useCallback(() => {
        if (!started.current) {
            started.current = true
            run()
            return
        }
        if (loadedAt.current && !refreshing.current && Date.now() - loadedAt.current > staleMs) {
            refreshing.current = true
            run({ silent: true }).finally(() => { refreshing.current = false })
        }
    }, [run, staleMs])

    const reload = useCallback(() => {
        started.current = true
        return run()
    }, [run])

    return { status, error, ensureLoaded, reload }
}

// Consumer side: kick off the load when the component mounts.
export function useEnsureLoaded(...ensureFns) {
    useEffect(() => {
        ensureFns.forEach((fn) => fn())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, ensureFns)
}

// Shared "is anything I need still loading / failed?" reduction.
export function combineStatus(resources) {
    const loading = resources.some((r) => r.status === 'idle' || r.status === 'loading')
    const failed = resources.find((r) => r.status === 'error')
    return { loading, error: failed?.error || null }
}
