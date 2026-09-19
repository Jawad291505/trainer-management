import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

// The API buckets every "day" (DailyLog.date, diet plan weekday) in Pakistan
// Standard Time — UTC+5, no DST — see backend utils/pktTime.js. These helpers
// keep the UI on the same calendar as the server, whatever the browser's zone.
const PKT_TZ = 'Asia/Karachi'
const PKT_OFFSET_MIN = 5 * 60

// 'YYYY-MM-DD' of the PKT calendar day containing `date`.
export function pktDateStr(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: PKT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

// Step a 'YYYY-MM-DD' string by whole days.
export function addDaysToDateStr(dateStr, delta) {
    const d = new Date(`${dateStr}T12:00:00Z`) // noon UTC avoids any offset edge case
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
}

// Format an API timestamp (ISO string / Date) as PKT wall-clock time.
export function formatPkt(value, fmt = 'D MMM') {
    return dayjs(value).utcOffset(PKT_OFFSET_MIN).format(fmt)
}
