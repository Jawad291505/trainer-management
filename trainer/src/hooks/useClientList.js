import { api } from '../services/api'
import { useAsyncData } from './useAsyncData'

// The trainer's client roster for pickers / dropdowns. Briefly cached (and
// deduped in flight) by the api client, so several pages/modals opened in a row
// share one request; any write clears the cache. Pass enabled=false to hold the
// request until the picker is actually needed.
export function useClientList(enabled = true) {
    const res = useAsyncData(() => api.get('/clients', { ttl: 30_000 }).then((r) => r.items || []), [], { enabled })
    return { clients: res.data || [], loading: res.loading, error: res.error, reload: res.reload }
}
