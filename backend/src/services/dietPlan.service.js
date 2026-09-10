import { Food, NutritionConfig } from '../models/index.js'
import {
    computeNutrition,
    formatQty,
    giLevel,
    glItemLevel,
    glMealLevel,
    sumMacros,
} from './nutrition.service.js'

// Resolve a stored DietPlan (or DietPlanTemplate) — whose meal items hold only
// { foodCode, qty } — into the fully-computed shape the front-end renders:
// per-item macros + GI/GL + level, per-meal totals + meal GL level, and day
// totals. This is the server-side equivalent of resolveItem() + the useMemo
// totals in user/src/portals/client/pages/MyDiet.jsx and the dayTotals reduce in
// trainer/src/portals/trainer/pages/DietPlans.jsx.
export async function resolvePlanNutrition(plan) {
    const thresholds = await NutritionConfig.getDefault()

    // Load every referenced food in one query.
    const codes = [...new Set(plan.meals.flatMap((m) => m.items.map((it) => it.foodCode)))]
    const foods = await Food.find({ code: { $in: codes } })
    const byCode = new Map(foods.map((f) => [f.code, f]))

    const meals = plan.meals.map((meal) => {
        const items = meal.items.map((it) => {
            const food = byCode.get(it.foodCode)
            if (!food) {
                return {
                    foodCode: it.foodCode,
                    name: it.food_name || 'Unknown food',
                    qty: it.qty,
                    qtyLabel: `${it.qty ?? ''}`,
                    unit: it.unit || '',
                    cal: 0, protein: 0, carbs: 0, fat: 0, gi: 0, gl: 0,
                    giLevel: 'low', glLevel: 'low',
                    missing: true,
                }
            }
            const n = computeNutrition(food, it.qty)
            return {
                foodCode: food.code,
                foodId: String(food._id),
                name: food.name,
                category: food.category,
                qty: it.qty,
                qtyLabel: formatQty(food, it.qty),
                unit: food.unit,
                step: food.step,
                ...n,
                giLevel: giLevel(n.gi, thresholds),
                glLevel: glItemLevel(n.gl, thresholds),
            }
        })

        const totals = sumMacros(items)
        return {
            id: meal._id ? String(meal._id) : undefined,
            name: meal.name,
            time: meal.time,
            notes: meal.notes,
            taskKey: meal.taskKey,
            items,
            totals,
            mealGLLevel: glMealLevel(totals.gl, thresholds),
        }
    })

    const dayTotals = sumMacros(meals.map((m) => m.totals))

    return {
        meals,
        dayTotals,
        dayGLLevel: glMealLevel(dayTotals.gl, thresholds),
        thresholds: {
            gi: thresholds.gi,
            glItem: thresholds.glItem,
            glMeal: thresholds.glMeal,
        },
    }
}

// Serialise a DietPlan document + its computed nutrition for an API response.
export async function serializeDietPlan(plan) {
    const nutrition = await resolvePlanNutrition(plan)
    const obj = plan.toObject ? plan.toObject() : plan
    return { ...obj, ...nutrition }
}
