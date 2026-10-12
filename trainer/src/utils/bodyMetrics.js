// Live body-metric previews for the client forms — the same formulas as the
// backend's services/bodyMetrics.service.js, which supplies the saved figures.

export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
]

// Basal metabolic rate in kcal/day (Mifflin-St Jeor), or null while weight,
// height, age or gender is missing.
export function computeBMR({ weight, height, age, gender }) {
    if (!(weight > 0) || !(height > 0) || !(age > 0)) return null
    if (gender !== 'male' && gender !== 'female') return null
    return Math.round(10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161))
}

// "1,650 kcal/day" — or a prompt naming what a client's profile still lacks.
export function bmrLabel(bmr, { weight, height, age, gender } = {}) {
    if (bmr != null) return `${bmr.toLocaleString()} kcal/day`
    const missing = [!(weight > 0) && 'weight', !(height > 0) && 'height', !(age > 0) && 'age', !gender && 'gender'].filter(Boolean)
    return missing.length ? `Add ${missing.join(', ')}` : '—'
}
