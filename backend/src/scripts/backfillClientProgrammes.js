// Optional one-time backfill: give every client that has no programme yet a
// 30-day programme counted from the day they joined.
//
// Nothing requires this — a client with no programme keeps working and simply
// shows "No programme set" until their trainer or admin sets one. Run it only
// if you would rather start every existing client on a default programme.
// Long-standing clients will then show as "Programme ended" (a flag only — no
// access is removed) until it is extended or renewed.
//
// Clients whose backfilled programme is already over are marked as notified, so
// the reminder job does not send a wave of "programme ended" notices for them.
// Clients that already have a programme are left untouched. Safe to re-run.
//
// Usage:
//   node src/scripts/backfillClientProgrammes.js           (dry run — lists changes)
//   node src/scripts/backfillClientProgrammes.js --apply   (writes them)
import { connectDb, disconnectDb } from '../config/db.js'
import { Client } from '../models/index.js'
import { programmeOf } from '../services/programme.service.js'
import { pktStartOfDay } from '../utils/pktTime.js'

const TAG = '[backfill-programmes]'
const APPLY = process.argv.includes('--apply')
const DEFAULT_DAYS = 30
const day = (d) => new Date(d).toISOString().slice(0, 10)

async function main() {
    await connectDb()
    console.log(`${TAG} connected — ${APPLY ? 'APPLYING changes' : 'dry run (pass --apply to write)'}`)

    const clients = await Client.find({ $or: [{ programDays: null }, { programStart: null }] }, 'joinDate createdAt').lean()
    const counts = { ended: 0, running: 0 }
    for (const c of clients) {
        const programStart = pktStartOfDay(new Date(c.joinDate || c.createdAt || Date.now()))
        const p = programmeOf({ programDays: DEFAULT_DAYS, programStart })
        const ended = p.status === 'ended'
        counts[ended ? 'ended' : 'running'] += 1
        console.log(`${TAG} client ${c._id}: ${DEFAULT_DAYS} days from ${day(programStart)} -> ${p.status}`)
        if (APPLY) {
            await Client.updateOne(
                { _id: c._id },
                { programDays: DEFAULT_DAYS, programStart, programReminders: { endingSoon: ended, ended } },
            )
        }
    }

    const verb = APPLY ? 'set' : 'would set'
    console.log(`${TAG} ${verb} a programme on ${clients.length} client(s): ${counts.running} still running, ${counts.ended} already ended`)
    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error(`${TAG} failed:`, err)
    process.exit(1)
})
