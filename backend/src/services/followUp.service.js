import { FollowUp, Client, ScheduleActivity, Notification } from '../models/index.js'
import { WEEK_DAYS } from '../config/constants.js'

const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

// Whole days from today to `date` (negative = past), in server-local time.
export function daysFromToday(date) {
    return Math.round((startOfDay(date) - startOfDay(new Date())) / 86_400_000)
}

// "YYYY-MM-DD" is a calendar day, not an instant: parse it as local midnight so
// it never slips a day across timezones (new Date('2026-09-20') is UTC).
export function parseDay(value) {
    if (value instanceof Date) return startOfDay(value)
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
    return Number.isNaN(d.getTime()) ? null : startOfDay(d)
}

const pad = (n) => String(n).padStart(2, '0')
export const dayString = (d) => {
    const x = new Date(d)
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

// Legacy rows predate `status`; treat a set completedAt as completed.
export const statusOf = (fu) => (fu.completedAt ? 'completed' : fu.status || 'scheduled')

// Display grouping: completed / missed are terminal; otherwise by date vs today.
export function bucketFor(fu) {
    const status = statusOf(fu)
    if (status === 'completed') return 'completed'
    if (status === 'missed') return 'missed'
    const diff = daysFromToday(fu.date)
    if (diff < 0) return 'overdue'
    return diff === 0 ? 'today' : 'upcoming'
}

// Flat API shape. `privateNote` is trainer/admin-only — never sent to clients.
export function serializeFollowUp(fu, role) {
    const c = fu.client
    const t = fu.trainer
    const out = {
        id: String(fu._id),
        clientId: String(c?._id || c),
        clientName: c?.user?.name,
        avatarColor: c?.user?.avatarColor,
        goal: c?.goal,
        trainerId: String(t?._id || t),
        trainerName: t?.user?.name,
        date: dayString(fu.date),
        time: fu.time || '',
        type: fu.type,
        status: statusOf(fu),
        bucket: bucketFor(fu),
        note: fu.note,
        outcome: fu.outcome,
        completedAt: fu.completedAt,
        createdAt: fu.createdAt,
    }
    if (role !== 'client') out.privateNote = fu.privateNote
    return out
}

export const populateFollowUp = [
    { path: 'client', select: 'goal user', populate: { path: 'user', select: 'name avatarColor' } },
    { path: 'trainer', select: 'user', populate: { path: 'user', select: 'name' } },
]

// Keep Client.lastFollowUp / nextFollowUp (shown on client cards + profile) in
// step with the real follow-up rows.
export async function syncClientDates(clientId) {
    const [last, next] = await Promise.all([
        FollowUp.findOne({ client: clientId, completedAt: { $ne: null } }).sort({ completedAt: -1 }),
        FollowUp.findOne({ client: clientId, status: 'scheduled', completedAt: null }).sort({ date: 1 }),
    ])
    await Client.updateOne(
        { _id: clientId },
        { lastFollowUp: last?.completedAt ?? null, nextFollowUp: next?.date ?? null },
    )
}

// Reminder flags for a freshly scheduled / rescheduled follow-up. The client was
// just told about it, so skip reminders that would fire immediately after.
export function initialReminders(date) {
    const diff = daysFromToday(date)
    return { dayBefore: diff <= 1, dayOf: diff <= 0, overdue: false }
}

// ---- Calendar mirror --------------------------------------------------------
// One trainer-owned ScheduleActivity per follow-up. Because it carries `client`,
// schedule.controller.getSchedule already surfaces it on the client's calendar
// too, so a single row feeds both. Scope mirrors how the schedule buckets work:
// 'today', a weekday for the coming week, else 'upcoming'.
function scopeFor(date) {
    const diff = daysFromToday(date)
    if (diff === 0) return 'today'
    if (diff > 0 && diff < 7) return WEEK_DAYS[(new Date(date).getDay() + 6) % 7]
    return 'upcoming'
}

const ACTIVITY_STATUS = { scheduled: 'upcoming', completed: 'completed', missed: 'cancelled' }

export async function syncScheduleActivity(fu, { trainerUserId, clientName }) {
    const status = statusOf(fu)
    const fields = {
        scope: scopeFor(fu.date),
        date: fu.date,
        time: fu.time || '',
        title: `Follow-up: ${clientName}`,
        type: 'followup',
        notes: fu.note || '',
        status: ACTIVITY_STATUS[status],
        done: status === 'completed',
    }
    if (fu.scheduleActivity) {
        const updated = await ScheduleActivity.findByIdAndUpdate(fu.scheduleActivity, fields)
        if (updated) return
    }
    const activity = await ScheduleActivity.create({
        ...fields,
        owner: trainerUserId,
        ownerRole: 'trainer',
        client: fu.client._id || fu.client,
    })
    fu.scheduleActivity = activity._id
    await fu.save()
}

export async function removeScheduleActivity(fu) {
    if (fu.scheduleActivity) await ScheduleActivity.deleteOne({ _id: fu.scheduleActivity })
}

// ---- Notifications ----------------------------------------------------------
const TYPE_LABEL = { 'check-in': 'check-in', call: 'call', 'in-person': 'in-person session', 'plan-review': 'plan review' }

export const followUpLabel = (fu) => TYPE_LABEL[fu.type] || 'check-in'

export const followUpWhen = (fu) => {
    const day = new Date(fu.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    return fu.time ? `${day} at ${fu.time}` : day
}

export function notifyFollowUp({ userId, role, title, description, fu }) {
    return Notification.create({
        user: userId,
        role,
        type: 'followup',
        title,
        description,
        ref: { kind: 'followup', id: fu._id },
    })
}
