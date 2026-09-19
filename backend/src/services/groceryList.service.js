import { Food } from '../models/index.js'
import { resolveTodayDay } from '../utils/pktTime.js'
import { formatQty } from './nutrition.service.js'

const WINDOW_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

// Same "selected option wins, else first" rule as dietPlan.service.js —
// duplicated rather than shared because it operates on raw Mongoose
// subdocuments here vs. already-resolved plain objects there.
function pickSelectedOption(meal) {
    if (!meal.options || !meal.options.length) return null
    if (meal.selectedOptionId) {
        const found = meal.options.find((o) => String(o._id) === String(meal.selectedOptionId))
        if (found) return found
    }
    return meal.options[0]
}

// Sum every selected-option item's qty, per food code, across the 7 calendar
// days starting at `windowStart`, then group the result by Food.category so
// the client sees a shoppable list (produce, protein, dairy, ...).
export async function computeGroceryList(plan, windowStart) {
    const windowEnd = new Date(windowStart.getTime() + (WINDOW_DAYS - 1) * DAY_MS)

    const qtyByCode = new Map()
    for (let i = 0; i < WINDOW_DAYS; i += 1) {
        const date = new Date(windowStart.getTime() + i * DAY_MS)
        const day = resolveTodayDay(plan.days || [], null, date)
        if (!day) continue
        for (const meal of day.meals || []) {
            const option = pickSelectedOption(meal)
            if (!option) continue
            for (const item of option.items || []) {
                qtyByCode.set(item.foodCode, (qtyByCode.get(item.foodCode) || 0) + (Number(item.qty) || 0))
            }
        }
    }

    const codes = [...qtyByCode.keys()]
    const foods = await Food.find({ code: { $in: codes } })
    const byCode = new Map(foods.map((f) => [f.code, f]))

    const groupsByCategory = new Map()
    for (const [code, qty] of qtyByCode) {
        const food = byCode.get(code)
        const category = food?.category || 'Other'
        const line = {
            foodId: food ? String(food._id) : null,
            foodCode: code,
            name: food?.name || code,
            unit: food?.unit || '',
            qty: Math.round(qty * 100) / 100,
            qtyLabel: food ? formatQty(food, qty) : `${qty}`,
        }
        if (!groupsByCategory.has(category)) groupsByCategory.set(category, [])
        groupsByCategory.get(category).push(line)
    }

    const groups = [...groupsByCategory.entries()]
        .map(([category, items]) => ({
            category,
            items: items.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.category.localeCompare(b.category))

    return { windowStart, windowEnd, groups }
}
