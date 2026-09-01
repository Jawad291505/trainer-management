// Quantity helpers for meal-plan foods.
// A library food's serving is a plain number (`amount`) + a label (`unit`), and its
// macros belong to that serving. Changing the amount rescales the macros linearly —
// no string parsing, so the model maps cleanly onto a database later.

export function formatAmount(n) {
    const v = Number(n)
    if (!Number.isFinite(v)) return ''
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}

// Display string for a meal item: "2 medium", "150 g".
// Falls back to a legacy `qty` string for items created before amount/unit existed.
export function formatQty(it) {
    if (!it) return ''
    if (it.amount != null) return `${formatAmount(it.amount)}${it.unit ? ` ${it.unit}` : ''}`.trim()
    return it.qty ?? ''
}

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10

// Macros for `base` scaled to `amount` (base.amount is the serving the macros belong to).
// Returns null when it can't scale (no base amount) — caller leaves macros for manual edit.
export function scaleFoodMacros(base, amount) {
    const b = Number(base?.amount)
    const a = Number(amount)
    if (!b || !Number.isFinite(a) || a < 0) return null
    const r = a / b
    return {
        cal: Math.round((Number(base.cal) || 0) * r),
        protein: round1((Number(base.protein) || 0) * r),
        carbs: round1((Number(base.carbs) || 0) * r),
        fat: round1((Number(base.fat) || 0) * r),
    }
}
