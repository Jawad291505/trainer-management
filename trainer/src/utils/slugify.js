// Turns a display label into a stable, URL/DB-friendly key.
// Categories are stored with both a human `name` and this `slug`; once the data
// moves to a real database the slug is what other rows reference, so the visible
// name can be renamed later without breaking those references.
export function slugify(input) {
    return (
        String(input ?? '')
            .trim()
            .toLowerCase()
            .replace(/&/g, ' and ')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'category'
    )
}
