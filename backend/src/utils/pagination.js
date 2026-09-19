// Opt-in pagination for list endpoints.
//
// Sending `?page=` switches a list endpoint to paginated mode (`?limit=` sets the
// page size — default 12, max 100). Without `page` the endpoint keeps returning
// the full list, because several screens (pickers, dashboards) still need every row.

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// → { page, limit, skip } in paginated mode, or null when the caller wants the full list.
export function pageParams(query, defaultLimit = 12) {
    if (query.page === undefined) return null
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100)
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    return { page, limit, skip: (page - 1) * limit }
}

// Body for a paginated response; `count` mirrors `total` so existing readers keep working.
export const pagedBody = (items, total, { page, limit }) => ({
    count: total,
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
})
