// Meal times are stored as strings — "HH:mm" from the trainer's TimePicker, but
// older / admin-typed ones may be "8:00 AM". Ordering therefore compares
// minutes since midnight, never the raw strings ("9:00" > "13:00" as text).
const TIME_RE = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i

// Minutes since midnight, or null when the time is empty / unreadable.
export function mealTimeToMinutes(time) {
    const match = TIME_RE.exec(String(time ?? '').trim())
    if (!match) return null
    let hours = Number(match[1])
    const minutes = Number(match[2] || 0)
    const meridiem = match[3]?.toLowerCase()
    if (meridiem) {
        if (hours < 1 || hours > 12) return null
        hours = (hours % 12) + (meridiem === 'pm' ? 12 : 0)
    }
    if (hours > 23 || minutes > 59) return null
    return hours * 60 + minutes
}

// Chronological copy of `meals` — earliest first. Meals without a readable time
// go last, and ties keep their existing relative order (Array#sort is stable).
export function sortMealsByTime(meals = []) {
    const at = (m) => mealTimeToMinutes(m.time) ?? Infinity
    return [...meals].sort((a, b) => at(a) - at(b))
}
