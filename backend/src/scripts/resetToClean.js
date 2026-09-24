/**
 * Reset the database to a clean state, preserving:
 *   - The 3 named portal accounts (admin@fit360.com, trainer@fit360.com, client@fit360.com)
 *     and their Trainer/Client profile docs.
 *   - All master data: Food/Exercise where isMaster:true, ExerciseTechnique,
 *     LibraryCategory, LibraryResource, DietPlanTemplate, SubscriptionPlan, NutritionConfig.
 *
 * Deletes everything else:
 *   - Every other User (and its Trainer/Client/Member profile).
 *   - All Member docs (none of the 3 kept accounts is a member).
 *   - Trainer-custom Food/Exercise rows (isMaster:false).
 *   - All transactional collections in full: DietPlan, ExercisePlan, WorkoutSession,
 *     GroceryList, DailyLog, WeightEntry, ProgressPhoto, FollowUp, ScheduleActivity,
 *     CorrectionRequest, Conversation, Message, Notification, Payment, MemberPayment,
 *     Referral, Review.
 *
 * Then recomputes denormalized fields on the kept Trainer/Client docs
 * (clientCount, trainer link, lastFollowUp/nextFollowUp).
 *
 * Usage:
 *   node src/scripts/resetToClean.js            # dry run — prints counts only, deletes nothing
 *   node src/scripts/resetToClean.js --execute  # actually performs the deletions
 */
import { connectDb, disconnectDb } from '../config/db.js'
import {
    User, Trainer, Client, Member,
    Food, Exercise,
    DietPlan, ExercisePlan, WorkoutSession, GroceryList, DailyLog, WeightEntry,
    ProgressPhoto, FollowUp, ScheduleActivity, CorrectionRequest, Conversation, Message,
    Notification, Payment, MemberPayment, Referral, Review,
} from '../models/index.js'

const KEEP_EMAILS = ['admin@fit360.com', 'trainer@fit360.com', 'client@fit360.com']

const EXECUTE = process.argv.includes('--execute')

async function main() {
    await connectDb()
    console.log(`[resetToClean] connected — mode: ${EXECUTE ? 'EXECUTE (will delete)' : 'DRY RUN (no changes)'}`)

    const keepUsers = await User.find({ email: { $in: KEEP_EMAILS } })
    if (keepUsers.length !== KEEP_EMAILS.length) {
        const found = keepUsers.map((u) => u.email)
        const missing = KEEP_EMAILS.filter((e) => !found.includes(e))
        throw new Error(`Aborting — expected accounts not found: ${missing.join(', ')}`)
    }
    const keepUserIds = keepUsers.map((u) => u._id)
    console.log('[resetToClean] keeping users:', keepUsers.map((u) => `${u.email} (${u.role})`).join(', '))

    const keepTrainer = await Trainer.findOne({ user: keepUsers.find((u) => u.role === 'trainer')._id })
    const keepClient = await Client.findOne({ user: keepUsers.find((u) => u.role === 'client')._id })
    const keepTrainerIds = keepTrainer ? [keepTrainer._id] : []
    const keepClientIds = keepClient ? [keepClient._id] : []

    const plan = [
        ['User (all except the 3 kept)', User, { _id: { $nin: keepUserIds } }],
        ['Trainer (all except the kept one)', Trainer, { _id: { $nin: keepTrainerIds } }],
        ['Client (all except the kept one)', Client, { _id: { $nin: keepClientIds } }],
        ['Member (all)', Member, {}],
        ['Food (trainer-custom, isMaster:false)', Food, { isMaster: false }],
        ['Exercise (trainer-custom, isMaster:false)', Exercise, { isMaster: false }],
        ['DietPlan (all)', DietPlan, {}],
        ['ExercisePlan (all)', ExercisePlan, {}],
        ['WorkoutSession (all)', WorkoutSession, {}],
        ['GroceryList (all)', GroceryList, {}],
        ['DailyLog (all)', DailyLog, {}],
        ['WeightEntry (all)', WeightEntry, {}],
        ['ProgressPhoto (all)', ProgressPhoto, {}],
        ['FollowUp (all)', FollowUp, {}],
        ['ScheduleActivity (all)', ScheduleActivity, {}],
        ['CorrectionRequest (all)', CorrectionRequest, {}],
        ['Conversation (all)', Conversation, {}],
        ['Message (all)', Message, {}],
        ['Notification (all)', Notification, {}],
        ['Payment (all)', Payment, {}],
        ['MemberPayment (all)', MemberPayment, {}],
        ['Referral (all)', Referral, {}],
        ['Review (all)', Review, {}],
    ]

    let totalToDelete = 0
    for (const [label, Model, filter] of plan) {
        const count = await Model.countDocuments(filter)
        totalToDelete += count
        console.log(`  ${EXECUTE ? 'deleting' : 'would delete'} ${String(count).padStart(6)}  ${label}`)
        if (EXECUTE && count > 0) {
            await Model.deleteMany(filter)
        }
    }

    console.log(`[resetToClean] ${EXECUTE ? 'deleted' : 'would delete'} ${totalToDelete} documents total`)

    // Report master-data counts left untouched, for visibility.
    const untouched = [
        ['Food (isMaster:true)', Food, { isMaster: true }],
        ['Exercise (isMaster:true)', Exercise, { isMaster: true }],
    ]
    for (const [label, Model, filter] of untouched) {
        console.log(`  kept (master data) ${String(await Model.countDocuments(filter)).padStart(6)}  ${label}`)
    }

    if (EXECUTE) {
        // Recompute denormalized fields on the surviving Trainer/Client docs.
        if (keepTrainer) {
            keepTrainer.clientCount = await Client.countDocuments({ trainer: keepTrainer._id })
            await keepTrainer.save()
        }
        if (keepClient) {
            keepClient.lastFollowUp = null
            keepClient.nextFollowUp = null
            if (keepTrainer) keepClient.trainer = keepTrainer._id
            await keepClient.save()
        }
        console.log('[resetToClean] recomputed denormalized Trainer/Client fields')
    } else {
        console.log('[resetToClean] dry run complete — re-run with --execute to apply')
    }

    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error('[resetToClean] failed:', err)
    process.exit(1)
})
