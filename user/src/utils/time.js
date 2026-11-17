import dayjs from 'dayjs'

const PKT_TZ = 'Asia/Karachi'

// Meal times are stored as Pakistan wall-clock time by the trainer app.
// Convert that time to the client's browser timezone before displaying it.
export function formatMealTime(time, date) {
    if (!time) return ''

    const parsedTime = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)?$/i.exec(time)
    if (parsedTime) {
        let hours = Number(parsedTime[1])
        const minutes = Number(parsedTime[2])
        const meridiem = parsedTime[3]?.toUpperCase()

        if (hours <= 12 && meridiem) {
            hours = (hours % 12) + (meridiem === 'PM' ? 12 : 0)
        }

        if (hours <= 23) {
            const dateStr = typeof date === 'string'
                ? date
                : new Intl.DateTimeFormat('en-CA', {
                    timeZone: PKT_TZ,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                }).format(date || new Date())
            const instant = new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+05:00`)

            if (!Number.isNaN(instant.getTime())) {
                return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(instant)
            }
        }
    }

    const parsed = dayjs(time, 'HH:mm')
    return parsed.isValid() ? parsed.format('h:mm A') : time
}

// Follow-up and schedule times are not meal-plan PKT times.
export function formatTime(time) {
    if (!time) return ''
    const parsed = dayjs(time, 'HH:mm')
    return parsed.isValid() ? parsed.format('h:mm A') : time
}
