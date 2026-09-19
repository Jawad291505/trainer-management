import { getFoodsByCode, getThresholds } from './libraryCache.js'
import { resolveTodayDay } from '../utils/pktTime.js'
import {
    computeNutrition,
    formatQty,
    giLevel,
    glItemLevel,
    glMealLevel,
    sumMacros,
} from './nutrition.service.js'

function resolveItems(items, thresholds, byCode) {
    return (items || []).map((it) => {
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
}

// A meal's `selectedOptionId` wins when it names one of the meal's own
// options; otherwise the first option is the default (also covers plans
// saved before options existed, once wrapped by the migration script).
function pickSelectedOption(options, selectedOptionId) {
    if (!options.length) return null
    if (selectedOptionId) {
        const found = options.find((o) => o.id === String(selectedOptionId))
        if (found) return found
    }
    return options[0]
}

async function resolveMeals(meals, thresholds, byCode) {
    return meals.map((meal) => {
        const options = (meal.options || []).map((opt) => {
            const items = resolveItems(opt.items, thresholds, byCode)
            const totals = sumMacros(items)
            return {
                id: opt._id ? String(opt._id) : undefined,
                label: opt.label,
                items,
                totals,
                optionGLLevel: glMealLevel(totals.gl, thresholds),
            }
        })

        // Top-level items/totals mirror the *selected* option so existing
        // day/plan aggregate math (below) keeps working unchanged.
        const selected = pickSelectedOption(options, meal.selectedOptionId)
        const totals = selected ? selected.totals : sumMacros([])
        return {
            id: meal._id ? String(meal._id) : undefined,
            name: meal.name,
            time: meal.time,
            notes: meal.notes,
            taskKey: meal.taskKey,
            options,
            selectedOptionId: selected ? selected.id : null,
            items: selected ? selected.items : [],
            totals,
            mealGLLevel: glMealLevel(totals.gl, thresholds),
        }
    })
}

// Resolve a stored DietPlanTemplate — a flat, non-per-day meal list — into the
// fully-computed shape the front-end renders: per-item macros + GI/GL + level,
// per-meal totals + meal GL level, and day totals. This is the server-side
// equivalent of resolveItem() + the useMemo totals in
// user/src/portals/client/pages/MyDiet.jsx and the dayTotals reduce in
// trainer/src/portals/trainer/pages/DietPlans.jsx.
export async function resolvePlanNutrition(plan) {
    const codes = [
        ...new Set(plan.meals.flatMap((m) => (m.options || []).flatMap((o) => o.items.map((it) => it.foodCode)))),
    ]
    const [thresholds, byCode] = await Promise.all([getThresholds(), getFoodsByCode(codes)])

    const meals = await resolveMeals(plan.meals, thresholds, byCode)
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

// Resolve a stored DietPlan — organised into per-weekday `days`, each holding
// its own meals (items hold only { foodCode, qty }) — into the fully-computed
// shape the front-end renders, plus which day is "today" in PKT.
export async function resolveDietPlanNutrition(plan) {
    // Every referenced food across every day, resolved from the in-memory master
    // library (custom foods fall back to one query) alongside the cached thresholds.
    const codes = [
        ...new Set(
            plan.days.flatMap((d) =>
                d.meals.flatMap((m) => (m.options || []).flatMap((o) => o.items.map((it) => it.foodCode))),
            ),
        ),
    ]
    const [thresholds, byCode] = await Promise.all([getThresholds(), getFoodsByCode(codes)])

    const days = await Promise.all(
        plan.days.map(async (d) => {
            const meals = await resolveMeals(d.meals, thresholds, byCode)
            const dayTotals = sumMacros(meals.map((m) => m.totals))
            return {
                id: d._id ? String(d._id) : undefined,
                day: d.day,
                meals,
                dayTotals,
                dayGLLevel: glMealLevel(dayTotals.gl, thresholds),
            }
        }),
    )

    const todayDay = resolveTodayDay(plan.days, plan.todayDayId)

    return {
        days,
        resolvedTodayDayId: todayDay?._id ? String(todayDay._id) : null,
        thresholds: {
            gi: thresholds.gi,
            glItem: thresholds.glItem,
            glMeal: thresholds.glMeal,
        },
    }
}

// Serialise a DietPlan document + its computed nutrition for an API response.
export async function serializeDietPlan(plan) {
    const nutrition = await resolveDietPlanNutrition(plan)
    const obj = plan.toObject ? plan.toObject() : plan
    return { ...obj, ...nutrition }
}
