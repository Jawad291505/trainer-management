// Body metrics derived from a client's profile. Nothing here is stored — the
// figures are computed from the current weight / height / age / gender each time
// a client is returned, so they follow every weight update and need no backfill.
// Each returns null when an input it needs is missing (e.g. clients added before
// gender was captured have no BMR until it is filled in).

const positive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0

// Body-mass index: kg / m², one decimal. Same formula as the admin Add-client form.
export function computeBMI(weightKg, heightCm) {
    if (!positive(weightKg) || !positive(heightCm)) return null
    return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1))
}

// Basal metabolic rate in kcal/day — Mifflin-St Jeor:
//   10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + 5 (male) / − 161 (female)
export function computeBMR({ weight, height, age, gender }) {
    if (!positive(weight) || !positive(height) || !positive(age)) return null
    if (gender !== 'male' && gender !== 'female') return null
    return Math.round(10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161))
}
