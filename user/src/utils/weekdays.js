export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Training days are keyed by weekday name — the API resolves "today's" workout
// by matching the plan day's name against the PKT weekday (backend
// utils/pktTime.js -> resolveTodayDay), accepting the full or short name.

// 0 (Monday) – 6 (Sunday), or -1 when `name` isn't a weekday ("Day 1", "Today"…).
export function weekdayIndex(name) {
    const n = String(name || '').trim().toLowerCase()
    return WEEKDAYS.findIndex((w) => w.toLowerCase() === n || w.slice(0, 3).toLowerCase() === n)
}

// Monday → Sunday; days not named after a weekday keep their order at the end.
export function sortByWeekday(days) {
    const rank = (d) => { const i = weekdayIndex(d.day); return i === -1 ? WEEKDAYS.length : i }
    return [...days].sort((a, b) => rank(a) - rank(b))
}

// The plan day scheduled on a given weekday name ("Monday"), if any.
export function dayForWeekday(days, weekday) {
    const idx = weekdayIndex(weekday)
    return days.find((d) => weekdayIndex(d.day) === idx && idx !== -1)
        || days.find((d) => String(d.day || '').trim().toLowerCase() === 'everyday')
        || null
}
