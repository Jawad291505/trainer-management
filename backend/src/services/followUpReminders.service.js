import { FollowUp } from '../models/index.js'
import {
    daysFromToday, populateFollowUp, notifyFollowUp, followUpLabel, followUpWhen,
} from './followUp.service.js'

const RUN_EVERY_MS = 30 * 60 * 1000

// One pass over open follow-ups. Each reminder is sent at most once per date
// (tracked in FollowUp.reminders, reset on reschedule):
//   - client: the day before, and the day of
//   - trainer: once, when a follow-up slips past its date
export async function runFollowUpReminders() {
    const horizon = new Date()
    horizon.setHours(0, 0, 0, 0)
    horizon.setDate(horizon.getDate() + 2) // nothing later than "tomorrow" needs a reminder

    const open = await FollowUp.find({
        status: { $nin: ['completed', 'missed'] },
        completedAt: null,
        date: { $lt: horizon },
    }).populate(populateFollowUp)

    let sent = 0
    for (const fu of open) {
        if (!fu.client?.user || !fu.trainer?.user) continue
        const diff = daysFromToday(fu.date)
        const r = fu.reminders

        if (diff === 1 && !r.dayBefore) {
            await notifyFollowUp({
                userId: fu.client.user._id,
                role: 'client',
                title: 'Follow-up tomorrow',
                description: `Your ${followUpLabel(fu)} with ${fu.trainer.user.name} is ${followUpWhen(fu)}.`,
                fu,
            })
            r.dayBefore = true
        } else if (diff === 0 && !r.dayOf) {
            await notifyFollowUp({
                userId: fu.client.user._id,
                role: 'client',
                title: 'Follow-up today',
                description: `Your ${followUpLabel(fu)} with ${fu.trainer.user.name} is today${fu.time ? ` at ${fu.time}` : ''}.`,
                fu,
            })
            r.dayBefore = true
            r.dayOf = true
        } else if (diff < 0 && !r.overdue) {
            await notifyFollowUp({
                userId: fu.trainer.user._id,
                role: 'trainer',
                title: 'Follow-up overdue',
                description: `${fu.client.user.name}'s ${followUpLabel(fu)} was due ${followUpWhen(fu)}.`,
                fu,
            })
            r.overdue = true
        } else {
            continue
        }
        fu.markModified('reminders')
        await fu.save()
        sent += 1
    }
    return sent
}

// Fire once on boot (catches up after downtime), then every 30 minutes. The
// timer is unref'd so it never keeps the process alive on its own.
export function startFollowUpReminderJob() {
    const tick = () =>
        runFollowUpReminders().catch((err) => console.error('[followups] reminder run failed:', err))
    tick()
    setInterval(tick, RUN_EVERY_MS).unref()
}
