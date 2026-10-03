import dayjs from 'dayjs'

// Meal times are stored as a 24h "HH:mm" string (see DietPlans.jsx TimePicker
// -> buildDaysPayload). Format consistently wherever a meal time is shown.
export function formatMealTime(time) {
    if (!time) return ''
    const parsed = dayjs(time, 'HH:mm')
    return parsed.isValid() ? parsed.format('h:mm A') : time
}

// Minutes since midnight for a stored meal time ("HH:mm", or a legacy "8:00 AM"),
// or null when it's empty / unreadable. Mirrors backend utils/mealTime.js.
export function mealTimeToMinutes(time) {
    const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(String(time ?? '').trim())
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

// Chronological copy of `meals` — earliest first, compared as times rather than
// strings. Meals without a readable time go last; ties keep their relative order.
export function sortMealsByTime(meals = []) {
    const at = (m) => mealTimeToMinutes(m.time) ?? Infinity
    return [...meals].sort((a, b) => at(a) - at(b))
}

// Same "HH:mm" -> "h:mm A" formatting, for non-meal times (follow-ups, schedule).
export const formatTime = formatMealTime
