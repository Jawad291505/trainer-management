// In-memory cache for a master library collection (exercises, foods).
//
// The master lists are ~150 KB of slow-changing reference data that every
// trainer/admin session reads, and pulling that many bytes from Atlas can take
// tens of seconds on a poor link. So the list is read once (warm() at boot),
// served from memory, and refreshed in the background once it goes stale — a
// request never waits on the database unless the cache has never been filled.
//
// Entries are stored as `toJSON()` output so responses keep the same shape
// (virtual `id` included) as a live `Model.find()`.
export function createMasterListCache(Model, { sort, staleMs = 5 * 60_000 }) {
    let items = null
    let loadedAt = 0
    let inflight = null
    let version = 0 // bumped by invalidate() so a read that started before a write can't repopulate stale data

    function load() {
        if (!inflight) {
            const startedAt = version
            const pending = Model.find({ isMaster: true })
                .sort(sort)
                .then((docs) => {
                    const list = docs.map((d) => d.toJSON())
                    if (startedAt === version) {
                        items = list
                        loadedAt = Date.now()
                    }
                    return list
                })
                .finally(() => { if (inflight === pending) inflight = null })
            inflight = pending
        }
        return inflight
    }

    return {
        // Resolves with the master list; on a stale hit returns the old list and refreshes behind it.
        async get() {
            if (!items) return load()
            if (Date.now() - loadedAt > staleMs) load().catch(() => {})
            return items
        },
        // Call after any write to the collection so the next read refetches.
        invalidate() {
            version += 1
            items = null
            loadedAt = 0
            inflight = null
        },
        // Fire-and-forget fill for server start-up.
        warm() {
            return load().catch((err) => console.warn(`[cache] ${Model.modelName} warm-up failed:`, err.message))
        },
    }
}
