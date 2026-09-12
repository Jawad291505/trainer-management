// One-time migration: convert existing DietPlan documents from a flat
// `meals` array to the new per-day `days: [{ day, meals }]` structure. Every
// plan's existing meals become a single "Everyday" day, preserving current
// behavior (same meals shown every day) until a trainer splits them into
// specific weekdays.
//
// Usage:
//   node src/scripts/migrateDietPlanDays.js
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../config/db.js'
import { DietPlan } from '../models/index.js'

async function main() {
    await connectDb()
    console.log('[migrate-diet-plan-days] connected — starting')

    // Read as plain objects to see the pre-migration `meals` field even
    // though it's no longer declared on the DietPlan schema.
    const plans = await DietPlan.collection.find({ meals: { $exists: true } }).toArray()
    console.log(`[migrate-diet-plan-days] found ${plans.length} plan(s) with flat meals`)

    let migrated = 0
    for (const plan of plans) {
        await DietPlan.collection.updateOne(
            { _id: plan._id },
            {
                $set: { days: [{ _id: new mongoose.Types.ObjectId(), day: 'Everyday', meals: plan.meals || [] }] },
                $unset: { meals: '' },
            },
        )
        migrated += 1
    }

    console.log(`[migrate-diet-plan-days] migrated ${migrated} plan(s)`)
    await disconnectDb()
    console.log('[migrate-diet-plan-days] done')
    process.exit(0)
}

main().catch((err) => {
    console.error('[migrate-diet-plan-days] failed:', err)
    process.exit(1)
})
