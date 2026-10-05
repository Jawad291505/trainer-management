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

// Category list for a picker: the built-in list from the shared JSON plus any
// category the admin has added since, read off the library items themselves
// (only master items — a trainer's own custom entries never add categories).
export function libraryCategories(base, items) {
    return mergeCategories(base, items.filter((x) => x.source !== 'trainer').map((x) => x.category))
}
