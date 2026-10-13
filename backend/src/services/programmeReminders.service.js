import { Client } from '../models/index.js'
import { programmeOf } from './programme.service.js'
import { notifyUser } from './notify.service.js'

const RUN_EVERY_MS = 30 * 60 * 1000

const plural = (n) => `${n} day${n === 1 ? '' : 's'}`

// One pass over clients whose programme is running out. Each notice is sent at
// most once per programme (tracked in Client.programReminders, reset whenever
// the programme's length or start date changes):
//   - "ending soon": once the programme enters its last days
//   - "ended": the day after its last day
// Both go to the client and to their trainer. Nothing is locked when a
// programme ends — these are prompts to extend or renew.
export async function runProgrammeReminders() {
    const due = await Client.find({
        status: 'active',
        programDays: { $ne: null },
        programStart: { $ne: null },
        'programReminders.ended': { $ne: true },
    })
        .populate('user', 'name')
        .populate('trainer', 'user')

    let sent = 0
    for (const client of due) {
        const p = programmeOf(client)
        if (!p || !client.user) continue

        const name = client.user.name || 'A client'
        const ref = { kind: 'client', id: client._id }
        const notices = []
        if (p.status === 'ended') {
            notices.push(['client', 'Your programme has ended', `Your ${p.days}-day programme is complete. Talk to your trainer about what comes next.`])
            notices.push(['trainer', 'Programme ended', `${name}'s ${p.days}-day programme has ended — extend or renew it.`])
            client.programReminders = { endingSoon: true, ended: true }
        } else if (p.status === 'ending' && !client.programReminders?.endingSoon) {
            const left = p.daysLeft === 0 ? 'ends today' : `ends in ${plural(p.daysLeft)}`
            notices.push(['client', 'Your programme is ending soon', `Your ${p.days}-day programme ${left}.`])
            notices.push(['trainer', 'Programme ending soon', `${name}'s ${p.days}-day programme ${left}.`])
            client.programReminders = { endingSoon: true, ended: false }
        } else {
            continue
        }

        for (const [role, title, description] of notices) {
            const userId = role === 'client' ? client.user._id : client.trainer?.user
            await notifyUser(userId, role, { type: 'programme', title, description, ref })
        }
        await client.save()
        sent += 1
    }
    return sent
}

// Fire once on boot (catches up after downtime), then every 30 minutes. The
// timer is unref'd so it never keeps the process alive on its own.
export function startProgrammeReminderJob() {
    const tick = () =>
        runProgrammeReminders().catch((err) => console.error('[programme] reminder run failed:', err))
    tick()
    setInterval(tick, RUN_EVERY_MS).unref()
}
