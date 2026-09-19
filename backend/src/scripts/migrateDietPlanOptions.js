// One-time migration: wrap every meal's flat `items` array into
// `options: [{ label: 'Option 1', items }]` with `selectedOptionId: null`
// (defaults to that option), for both client DietPlans and admin
// DietPlanTemplates. Run once after deploying the meal-options feature.
//
// Usage:
//   node src/scripts/migrateDietPlanOptions.js
import mongoose from 'mongoose'
import { connectDb, disconnectDb } from '../config/db.js'
import { DietPlan, DietPlanTemplate } from '../models/index.js'

function wrapMealItems(meal) {
    if (Array.isArray(meal.options)) return meal
    const { items, ...rest } = meal
    return {
        ...rest,
        options: [{ _id: new mongoose.Types.ObjectId(), label: 'Option 1', items: items || [] }],
        selectedOptionId: null,
    }
}

async function migrateDietPlans() {
    const plans = await DietPlan.collection.find({ 'days.meals.items': { $exists: true } }).toArray()
    console.log(`[migrate-diet-plan-options] found ${plans.length} plan(s) with flat meal items`)

    for (const plan of plans) {
        const days = (plan.days || []).map((d) => ({ ...d, meals: (d.meals || []).map(wrapMealItems) }))
        await DietPlan.collection.updateOne({ _id: plan._id }, { $set: { days } })
    }
    console.log(`[migrate-diet-plan-options] migrated ${plans.length} plan(s)`)
}

async function migrateTemplates() {
    const templates = await DietPlanTemplate.collection.find({ 'meals.items': { $exists: true } }).toArray()
    console.log(`[migrate-diet-plan-options] found ${templates.length} template(s) with flat meal items`)

    for (const t of templates) {
        const meals = (t.meals || []).map(wrapMealItems)
        await DietPlanTemplate.collection.updateOne({ _id: t._id }, { $set: { meals } })
    }
    console.log(`[migrate-diet-plan-options] migrated ${templates.length} template(s)`)
}

async function main() {
    await connectDb()
    console.log('[migrate-diet-plan-options] connected — starting')
    await migrateDietPlans()
    await migrateTemplates()
    await disconnectDb()
    console.log('[migrate-diet-plan-options] done')
    process.exit(0)
}

main().catch((err) => {
    console.error('[migrate-diet-plan-options] failed:', err)
    process.exit(1)
})
