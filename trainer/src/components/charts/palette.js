// Chart color helpers reading from the live theme (CSS variables).
export function themeVar(name, fallback = '#0b2545') {
    if (typeof window === 'undefined') return fallback
    const v = getComputedStyle(document.documentElement).getPropertyValue(name)
    return v ? v.trim() : fallback
}

// Categorical palette for pies/bars. Primary first, then supporting hues.
export function categorical(primary) {
    return [primary, '#16a34a', '#d97706', '#dc2626', '#2563eb', '#7c3aed', '#0f766e']
}

export const STATUS_COLORS = {
    paid: '#16a34a',
    pending: '#d97706',
    failed: '#dc2626',
    refunded: '#2563eb',
}
