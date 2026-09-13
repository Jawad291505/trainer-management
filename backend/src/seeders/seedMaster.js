import { loadData } from './loadJson.js'
import { slugify } from '../utils/slugify.js'
import {
    Food,
    Exercise,
    ExerciseTechnique,
    LibraryCategory,
    NutritionConfig,
    DietPlanTemplate,
    SubscriptionPlan,
} from '../models/index.js'

// Idempotent master-data seed. Re-running updates existing rows (matched by their
// stable code / key / slug) and inserts new ones — it never duplicates and never
// touches user-generated data (diet plans, clients, ...).

async function seedFoods() {
    const data = await loadData('foodLibrary.json')

    // ---- categories ----
    let order = 0
    for (const name of data.categories || []) {
        await LibraryCategory.updateOne(
            { kind: 'food', slug: slugify(name) },
            { $set: { kind: 'food', name, slug: slugify(name), order: order++ } },
            { upsert: true },
        )
    }

    // ---- GI/GL thresholds (singleton) ----
    if (data.thresholds) {
        const cfg = await NutritionConfig.getDefault()
        cfg.gi = data.thresholds.gi
        cfg.glItem = data.thresholds.glItem
        cfg.glMeal = data.thresholds.glMeal
        await cfg.save()
    }

    // ---- foods ----
    const ops = (data.items || []).map((it) => ({
        updateOne: {
            filter: { code: it.id },
            update: {
                $set: {
                    code: it.id,
                    pdfId: it.pdfId ?? null,
                    name: it.name,
                    category: it.category,
                    unit: it.unit || 'g',
                    base: it.base,
                    step: it.step ?? 10,
                    defaultQty: it.defaultQty ?? it.base,
                    serving: it.serving || '',
                    gi: it.gi ?? 0,
                    gl: it.gl ?? 0,
                    cal: it.cal ?? 0,
                    protein: it.protein ?? 0,
                    carbs: it.carbs ?? 0,
                    fat: it.fat ?? 0,
                    fiber: it.fiber ?? 0,
                    source: it.source === 'pdf' ? 'pdf' : 'admin',
                    isMaster: true,
                    owner: null,
                },
            },
            upsert: true,
        },
    }))
    if (ops.length) await Food.bulkWrite(ops, { ordered: false })
    return { foods: ops.length, foodCategories: (data.categories || []).length }
}

async function seedExercises() {
    const data = await loadData('exerciseLibrary.json')
    const techniques = await loadData('exerciseTechniques.json')

    // ---- techniques ----
    let tOrder = 0
    for (const t of techniques.items || []) {
        await ExerciseTechnique.updateOne(
            { key: t.key },
            { $set: { key: t.key, label: t.label, description: t.description || '', order: tOrder++ } },
            { upsert: true },
        )
    }

    // ---- categories ----
    let order = 0
    for (const name of data.categories || []) {
        await LibraryCategory.updateOne(
            { kind: 'exercise', slug: slugify(name) },
            { $set: { kind: 'exercise', name, slug: slugify(name), order: order++ } },
            { upsert: true },
        )
    }

    // ---- exercises ----
    const ops = (data.items || []).map((it) => ({
        updateOne: {
            filter: { code: it.id },
            update: {
                $set: {
                    code: it.id,
                    name: it.name,
                    category: it.category,
                    technique: it.technique || 'standard',
                    defaultSets: it.defaultSets ?? 3,
                    defaultReps: it.defaultReps ?? '8-12',
                    defaultRest: it.defaultRest ?? '60s',
                    youtube: it.youtube || '',
                    notes: it.notes || '',
                    equipment: it.equipment || '',
                    target: it.target || '',
                    source: it.source === 'trainer' ? 'trainer' : 'admin',
                    isMaster: true,
                    owner: null,
                },
            },
            upsert: true,
        },
    }))
    if (ops.length) await Exercise.bulkWrite(ops, { ordered: false })
    return {
        exercises: ops.length,
        exerciseCategories: (data.categories || []).length,
        techniques: (techniques.items || []).length,
    }
}

async function seedDietPlanTemplates() {
    const data = await loadData('dietPlans.json')
    let n = 0
    for (const plan of data.plans || []) {
        // Link each item's foodId to a Food _id where possible.
        const codes = plan.meals.flatMap((m) => m.items.map((it) => it.foodId))
        const foods = await Food.find({ code: { $in: codes } }, '_id code name')
        const byCode = new Map(foods.map((f) => [f.code, f]))

        const meals = plan.meals.map((m) => ({
            name: m.name,
            time: m.time || '',
            notes: m.notes || '',
            items: m.items.map((it) => ({
                food: byCode.get(it.foodId)?._id || null,
                foodCode: it.foodId,
                food_name: it.food || byCode.get(it.foodId)?.name || '',
                qty: it.qty,
                unit: it.unit || 'g',
            })),
        }))

        await DietPlanTemplate.updateOne(
            { code: plan.id },
            {
                $set: {
                    code: plan.id,
                    name: plan.name,
                    goal: plan.goal || 'Fat Loss',
                    description: plan.description || '',
                    meals,
                },
            },
            { upsert: true },
        )
        n += 1
    }
    return { dietPlanTemplates: n }
}

// Starter Member subscription tiers (Member self-signup -> plan selection).
// Matched by name so re-running never duplicates; Admin can edit prices/limits
// or add more plans later from the Subscription Plans page without touching this.
async function seedSubscriptionPlans() {
    const defaults = [
        { name: 'Starter', priceMonthly: 5000, maxClients: 20, maxTrainers: 5, sortOrder: 0, description: 'Up to 20 clients' },
        { name: 'Growth', priceMonthly: 10000, maxClients: 40, maxTrainers: 10, sortOrder: 1, description: 'Up to 40 clients' },
    ]
    for (const plan of defaults) {
        await SubscriptionPlan.updateOne(
            { name: plan.name },
            { $setOnInsert: plan },
            { upsert: true },
        )
    }
    // Backfill maxTrainers on plans created before it existed — default to
    // maxClients (the safe upper bound the field can never exceed) so admins
    // can then dial it down from the Subscription Plans page.
    const stale = await SubscriptionPlan.find({ maxTrainers: { $exists: false } })
    for (const plan of stale) {
        plan.maxTrainers = plan.maxClients
        await plan.save()
    }
    return { subscriptionPlans: defaults.length, backfilledMaxTrainers: stale.length }
}

export async function seedMasterData() {
    const a = await seedFoods()
    const b = await seedExercises()
    const c = await seedDietPlanTemplates()
    const d = await seedSubscriptionPlans()
    return { ...a, ...b, ...c, ...d }
}
