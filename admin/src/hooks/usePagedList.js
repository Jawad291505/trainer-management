import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

// Server-side paginated list for the admin management pages.
//
//   const list = usePagedList('/trainers', { params: { status, type }, search, pageSize: 12 })
//   list.items / list.total / list.page / list.pageSize / list.setPage / list.setPageSize
//   list.data                — the last raw response (for extra fields such as stats)
//   list.reload()            — refetch the current page (after create / delete)
//   list.setItems(fn)        — patch rows in place (after an inline edit)
//
// `params` (falsy or 'all' values are dropped) and `search` (debounced 300 ms)
// are sent as query params. Changing either, or the page size, returns to page 1.
// `loading` is true only until the first response — later fetches keep the current
// rows on screen (`fetching`) so paging and typing don't flash a skeleton.
// `transform` maps each row of the response (e.g. to a UI shape).
export function usePagedList(path, { params = {}, search = '', pageSize: initialSize = 12, transform } = {}) {
    const transformRef = useRef(transform)
    transformRef.current = transform

    const [debouncedSearch, setDebouncedSearch] = useState(search.trim())
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
        return () => clearTimeout(t)
    }, [search])

    const paramsRef = useRef(params)
    paramsRef.current = params

    const [pageSize, setPageSize] = useState(initialSize)
    const filterKey = `${JSON.stringify(params)}|${debouncedSearch}|${pageSize}`
    // The page is remembered together with the filters it belongs to, so a filter
    // change falls back to page 1 without a second (stale-page) request.
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 })
    const page = pageState.key === filterKey ? pageState.page : 1
    const setPage = useCallback((p) => setPageState({ key: filterKey, page: p }), [filterKey])

    const [state, setState] = useState({ items: [], data: null, total: 0, loading: true, fetching: true, error: null })
    const [tick, setTick] = useState(0)
    const reload = useCallback(() => setTick((t) => t + 1), [])
    const setItems = useCallback((updater) => {
        setState((s) => ({ ...s, items: typeof updater === 'function' ? updater(s.items) : updater }))
    }, [])

    useEffect(() => {
        let cancelled = false
        const qs = new URLSearchParams({ page, limit: pageSize })
        for (const [k, v] of Object.entries(paramsRef.current)) {
            if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.set(k, v)
        }
        if (debouncedSearch) qs.set('search', debouncedSearch)

        setState((s) => ({ ...s, fetching: true, error: null }))
        api.get(`${path}?${qs}`).then(
            (res) => {
                if (cancelled) return
                // Deleting the last row of the last page leaves it empty — step back.
                if (!res.items?.length && res.total > 0 && page > 1) { setPage(res.totalPages); return }
                const items = res.items || []
                setState({ items: transformRef.current ? items.map(transformRef.current) : items, data: res, total: res.total ?? 0, loading: false, fetching: false, error: null })
            },
            (error) => { if (!cancelled) setState((s) => ({ ...s, loading: false, fetching: false, error })) },
        )
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, filterKey, page, tick])

    return { ...state, page, pageSize, setPage, setPageSize, reload, setItems }
}
