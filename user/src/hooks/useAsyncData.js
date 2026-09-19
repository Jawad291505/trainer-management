import { useCallback, useEffect, useRef, useState } from 'react'

// Fetch-on-mount (and when `deps` change) with loading + error state, race
// protection for stale responses, and a `reload` for retry buttons.
//
//   const { data, loading, error, reload, setData } = useAsyncData(
//       () => api.get(`/things/${id}`),
//       [id],
//       { enabled: tabVisited },   // optional — hold the request until it's needed
//   )
//
// `loading` is true from the first render while enabled, so callers never flash
// an empty state before the request starts.
export function useAsyncData(fetcher, deps, { enabled = true } = {}) {
    const [state, setState] = useState({ data: null, loading: enabled, error: null })
    const [tick, setTick] = useState(0)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    useEffect(() => {
        if (!enabled) return undefined
        let cancelled = false
        setState((s) => (s.loading && !s.error ? s : { ...s, loading: true, error: null }))
        Promise.resolve()
            .then(() => fetcherRef.current())
            .then(
                (data) => { if (!cancelled) setState({ data, loading: false, error: null }) },
                (error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, error })) },
            )
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, enabled, tick])

    const reload = useCallback(() => setTick((t) => t + 1), [])
    const setData = useCallback((updater) => {
        setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }))
    }, [])

    return { ...state, reload, setData }
}

// A 404 from "current plan"-style endpoints means "none yet", not a failure.
export const orNullOn404 = (promise) =>
    promise.catch((err) => {
        if (err?.status === 404) return null
        throw err
    })
