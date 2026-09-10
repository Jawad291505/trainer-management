// Matches admin/src/context/LibraryContext.jsx `slug()` and data/README.md rules:
// lowercase, & -> and, non-alphanumerics -> '-', trim leading/trailing dashes.
export function slugify(name = '') {
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

// Library ids in the shared JSON look like "F-white-rice" / "X-barbell-bench-press".
export const foodCode = (name) => `F-${slugify(name)}`
export const exerciseCode = (name) => `X-${slugify(name)}`
