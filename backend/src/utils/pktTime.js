// All "what day/date is it" logic in this app runs on Pakistan Standard Time
// (UTC+5, no DST) rather than the server process's local clock, so day
// boundaries (DailyLog bucketing, "today's" diet/exercise plan day) stay
// consistent no matter where the server or client happen to be.
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000

const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Shift an instant onto PKT wall-clock time so its UTC* accessors read PKT
// year/month/day/weekday regardless of the server's own timezone.
function toPktShifted(date = new Date()) {
    return new Date(date.getTime() + PKT_OFFSET_MS)
}

export function pktDayName(date = new Date()) {
    const shifted = toPktShifted(date)
    const idx = shifted.getUTCDay()
    return { full: FULL_DAY_NAMES[idx], short: SHORT_DAY_NAMES[idx] }
}

// The UTC instant corresponding to midnight of `date`'s PKT calendar day —
// use this as the stable key for per-day records (e.g. DailyLog.date).
export function pktStartOfDay(date = new Date()) {
    const shifted = toPktShifted(date)
    shifted.setUTCHours(0, 0, 0, 0)
    return new Date(shifted.getTime() - PKT_OFFSET_MS)
}

// Resolve which entry in a `days` array (DietPlan or ExercisePlan) represents
// "today": an explicit `todayDayId` override wins, then an exact PKT weekday
// name match (full or short, case-insensitive), then the literal "today", then
// a catch-all "everyday" entry.
export function resolveTodayDay(days = [], todayDayId = null, date = new Date()) {
    if (todayDayId) {
        const byId = days.find((d) => String(d._id) === String(todayDayId))
        if (byId) return byId
    }
    const { full, short } = pktDayName(date)
    return (
        days.find((d) =>
            d.day.toLowerCase() === full.toLowerCase() ||
            d.day.toLowerCase() === short.toLowerCase(),
        ) ||
        days.find((d) => d.day.toLowerCase() === 'today') ||
        days.find((d) => d.day.toLowerCase() === 'everyday') ||
        null
    )
}
