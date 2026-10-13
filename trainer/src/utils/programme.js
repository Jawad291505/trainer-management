import { formatPkt } from './pkt'

// A client's programme — a length in days from a start date. The API derives
// everything shown here (backend services/programme.service.js) and returns it
// as `client.programme`:
//   { days, startDate, endDate, day, daysLeft, status } — or null when the
//   client has no programme yet (anyone added before programmes existed).

// Lengths offered when setting a programme; any whole number of days is allowed.
export const PROGRAMME_PRESETS = [30, 60, 90, 180]
export const PROGRAMME_MAX_DAYS = 3650

export const PROGRAMME_STATUS = {
    upcoming: { label: 'Not started', color: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
    active: { label: 'Active', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    ending: { label: 'Ending soon', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    ended: { label: 'Ended', color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
}

export const programmeStatus = (p) => PROGRAMME_STATUS[p?.status] || PROGRAMME_STATUS.active

const plural = (n) => `${n} day${n === 1 ? '' : 's'}`

// "90-day programme"
export const programmeName = (p) => (p ? `${p.days}-day programme` : 'No programme set')

// "Day 23 of 90"
export const programmeDay = (p) => (p ? `Day ${p.day} of ${p.days}` : '—')

// "67 days left" · "Ends today" · "Ended 12 Oct 2026" · "Starts 3 Nov 2026"
export function programmeHint(p) {
    if (!p) return ''
    if (p.status === 'upcoming') return `Starts ${formatPkt(p.startDate, 'D MMM YYYY')}`
    if (p.status === 'ended') return `Ended ${formatPkt(p.endDate, 'D MMM YYYY')}`
    return p.daysLeft === 0 ? 'Ends today' : `${plural(p.daysLeft)} left`
}

// 0-100 — how far through the programme the client is.
export const programmePercent = (p) => (p ? Math.round((p.day / p.days) * 100) : 0)
