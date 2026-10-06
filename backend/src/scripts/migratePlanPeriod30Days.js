// One-time migration: subscription periods used to run one calendar month and
// now run a fixed 30 days (PLAN_PERIOD_DAYS). Re-dates every running Member /
// Trainer subscription whose planExpiryDate is exactly "period start + one
// calendar month" to "period start + 30 days", so the days-remaining counter
// matches the new rule.
//
// Left untouched: subscriptions with no expiry, ones that have already lapsed,
// ones whose expiry isn't the old calendar-month date (e.g. already 30 days),
// and any that the new date would put in the past. Safe to re-run.
//
// Usage:
//   node src/scripts/migratePlanPeriod30Days.js           (dry run — lists changes)
//   node src/scripts/migratePlanPeriod30Days.js --apply   (writes them)
import { connectDb, disconnectDb } from '../config/db.js'
import { Member, Trainer, MemberPayment } from '../models/index.js'
import { addPlanPeriod } from '../services/subscription.service.js'

const TAG = '[migrate-plan-period]'
const APPLY = process.argv.includes('--apply')
const day = (d) => new Date(d).toISOString().slice(0, 10)

function addOneMonth(date) {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 1)
    return d
}

async function migrate(Model, payerKey, now) {
    const payers = await Model.find({ plan: { $ne: null }, planExpiryDate: { $gt: now } }, 'planExpiryDate').lean()
    let changed = 0
    for (const payer of payers) {
        // The approved payment that opened the current period — same rule as
        // currentPeriod() in subscription.service.js.
        const last = await MemberPayment.findOne({ [payerKey]: payer._id, status: 'approved' }, 'source submittedAt reviewedAt')
            .sort({ createdAt: -1 })
            .lean()
        const start = last && (last.source === 'admin_renewal' ? last.submittedAt : last.reviewedAt)
        if (!start) continue
        if (addOneMonth(start).getTime() !== new Date(payer.planExpiryDate).getTime()) continue

        const next = addPlanPeriod(start)
        if (next.getTime() === new Date(payer.planExpiryDate).getTime() || next <= now) continue

        console.log(`${TAG} ${payerKey} ${payer._id}: started ${day(start)}, ends ${day(payer.planExpiryDate)} -> ${day(next)}`)
        if (APPLY) await Model.updateOne({ _id: payer._id }, { planExpiryDate: next })
        changed += 1
    }
    return { checked: payers.length, changed }
}

async function main() {
    await connectDb()
    console.log(`${TAG} connected — ${APPLY ? 'APPLYING changes' : 'dry run (pass --apply to write)'}`)

    const now = new Date()
    const members = await migrate(Member, 'member', now)
    const trainers = await migrate(Trainer, 'trainer', now)

    const verb = APPLY ? 're-dated' : 'would re-date'
    console.log(`${TAG} members: ${verb} ${members.changed} of ${members.checked} running subscription(s)`)
    console.log(`${TAG} trainers: ${verb} ${trainers.changed} of ${trainers.checked} running subscription(s)`)
    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error(`${TAG} failed:`, err)
    process.exit(1)
})
