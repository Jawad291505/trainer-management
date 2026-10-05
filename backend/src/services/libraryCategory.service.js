import { LibraryCategory } from '../models/index.js'
import { slugify } from '../utils/slugify.js'

// Foods / exercises reference their category by display name, so a "new
// category" is simply a name no LibraryCategory row has yet. Saving a master
// item with one registers it here — nothing else has to change for it to show
// up in every category picker.

// Returns the canonical category name for `name`, creating the category when it
// is new. Matching is by slug, so "nuts & seeds" / "Nuts and Seeds" resolve to
// the existing "Nuts & Seeds" instead of spawning a near-duplicate.
export async function ensureLibraryCategory(kind, name) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ')
    const slug = slugify(clean)
    if (!slug) return clean

    const existing = await LibraryCategory.findOne({ kind, slug })
    if (existing) return existing.name

    const last = await LibraryCategory.findOne({ kind }).sort({ order: -1 })
    try {
        await LibraryCategory.create({ kind, name: clean, slug, order: (last?.order ?? -1) + 1 })
        return clean
    } catch (err) {
        // Two saves raced on the same new category — use whichever landed.
        if (err.code !== 11000) throw err
        return (await LibraryCategory.findOne({ kind, slug }))?.name || clean
    }
}

// Every category name for a library: the managed list in its own order, then
// any name that master items carry but was never registered (older data).
export async function listLibraryCategories(kind, masterItems = []) {
    const cats = await LibraryCategory.find({ kind }).sort({ order: 1, name: 1 })
    const names = cats.map((c) => c.name)
    const seen = new Set(names)
    const extra = [...new Set(masterItems.map((x) => x.category).filter((c) => c && !seen.has(c)))].sort()
    return { categories: [...names, ...extra], items: cats }
}
