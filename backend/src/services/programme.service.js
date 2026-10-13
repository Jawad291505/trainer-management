import ApiError from '../utils/ApiError.js'
import { pktStartOfDay } from '../utils/pktTime.js'
import { PROGRAMME_ENDING_SOON_DAYS, PROGRAMME_MAX_DAYS } from '../config/constants.js'

// A client's programme is a length in days (Client.programDays) counted from a
// start date (Client.programStart). Everything else — end date, which day they
// are on, days left, status — is derived here and never stored, so the admin,
// trainer and client apps always agree.
//
// Clients created before programmes existed have neither field: they simply
// have no programme (`null`) until someone sets one.

const DAY_MS = 24 * 60 * 60 * 1000

// The start date is the programme's Day 1 and `days` is its full length, so the
// last day is start + days - 1. Days are PKT calendar days, like every other
// "what day is it" in the app.
//
// status: 'upcoming' (starts in the future) | 'active' | 'ending' (last
// PROGRAMME_ENDING_SOON_DAYS days) | 'ended'
export function programmeOf(client, now = new Date()) {
    const days = Number(client?.programDays)
    if (!client?.programStart || !Number.isFinite(days) || days < 1) return null

    const start = pktStartOfDay(new Date(client.programStart))
    const elapsed = Math.round((pktStartOfDay(now) - start) / DAY_MS)
    const endDate = new Date(start.getTime() + (days - 1) * DAY_MS)

    let status
    if (elapsed < 0) status = 'upcoming'
    else if (elapsed >= days) status = 'ended'
    else if (days - elapsed - 1 <= PROGRAMME_ENDING_SOON_DAYS) status = 'ending'
    else status = 'active'

    const day = Math.min(Math.max(elapsed + 1, 0), days)
    return {
        days,
        startDate: start,
        endDate,
        day, // 0 before it starts, capped at `days` once it has ended
        daysLeft: days - day, // 0 on the last day and after
        status,
    }
}

// Reads `programDays` / `programStart` off a request body. Only keys present in
// the body are returned, so a PATCH never touches what it didn't send. A blank
// `programDays` clears the programme; setting a length with no start date
// (and none already stored) starts it today.
export function parseProgramme(body, current = null) {
    const out = {}
    const blank = (v) => v === null || v === undefined || String(v).trim() === ''

    if (body.programDays !== undefined) {
        if (blank(body.programDays)) {
            out.programDays = null
            out.programStart = null
        } else {
            const n = Number(body.programDays)
            if (!Number.isInteger(n) || n < 1 || n > PROGRAMME_MAX_DAYS) {
                throw ApiError.badRequest(`Programme length must be a whole number of days between 1 and ${PROGRAMME_MAX_DAYS}`)
            }
            out.programDays = n
        }
    }
    if (body.programStart !== undefined && out.programDays !== null) {
        if (blank(body.programStart)) throw ApiError.badRequest('Programme start date is required')
        const d = new Date(body.programStart)
        if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Programme start date is not a valid date')
        out.programStart = pktStartOfDay(d)
    }
    if (out.programDays && out.programStart === undefined && !current?.programStart) {
        out.programStart = pktStartOfDay()
    }
    return out
}

// Mongo filter for GET /api/clients?programme=active|ending|ended|none.
// 'active' covers everything still running that isn't in its last days
// (including a programme that hasn't started yet).
export function programmeFilter(status, now = new Date()) {
    const today = pktStartOfDay(now).getTime()
    // First instant after the programme's last day.
    const endsAt = { $add: ['$programStart', { $multiply: ['$programDays', DAY_MS] }] }
    const soon = new Date(today + (PROGRAMME_ENDING_SOON_DAYS + 1) * DAY_MS)
    const set = { programDays: { $ne: null }, programStart: { $ne: null } }

    switch (status) {
        case 'none': return { $or: [{ programDays: null }, { programStart: null }] }
        case 'ended': return { ...set, $expr: { $lte: [endsAt, new Date(today)] } }
        case 'ending': return { ...set, $expr: { $and: [{ $gt: [endsAt, new Date(today)] }, { $lte: [endsAt, soon] }, { $lte: ['$programStart', new Date(today)] }] } }
        case 'active': return { ...set, $expr: { $or: [{ $gt: [endsAt, soon] }, { $gt: ['$programStart', new Date(today)] }] } }
        default: return {}
    }
}
