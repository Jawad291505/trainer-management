import dayjs from 'dayjs'

// Meal times are stored as a 24h "HH:mm" string (see DietPlans.jsx TimePicker
// -> buildDaysPayload). Format consistently wherever a meal time is shown.
export function formatMealTime(time) {
    if (!time) return ''
    const parsed = dayjs(time, 'HH:mm')
    return parsed.isValid() ? parsed.format('h:mm A') : time
}

// Same "HH:mm" -> "h:mm A" formatting, for non-meal times (follow-ups, schedule).
export const formatTime = formatMealTime
