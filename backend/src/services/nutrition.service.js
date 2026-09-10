// Nutrition + glycemic calculations.
//
// This is a faithful port of the identical `utils/nutrition.js` shipped in all
// three front-end apps (admin, trainer, user). The formulas MUST stay in sync
// with those files — every diet-plan macro shown to a trainer or client is
// produced here so the numbers match across the platform.
//
// A Food document stores its macros against a `base` amount (e.g. per 100 g).
// Given a chosen `qty` we scale linearly.

const round = (n, d = 1) => {
    const f = 10 ** d
    return Math.round(n * f) / f
}

// Glycemic Load = (GI x available-carbohydrate grams) / 100.
// (utils/nutrition.js -> computeGL)
export function computeGL(gi, carbGrams) {
    if (!gi || !carbGrams) return 0
    return round((gi * carbGrams) / 100, 1)
}

// Scale a food's macros to the chosen quantity.
// (utils/nutrition.js -> computeNutrition)
// `food` is a Food doc/plain object with { base, cal, protein, carbs, fat, gi }.
export function computeNutrition(food, qty) {
    const base = Number(food.base) || 1
    const factor = (Number(qty) || 0) / base
    const gi = food.gi || 0
    return {
        cal: Math.round((food.cal || 0) * factor),
        protein: round((food.protein || 0) * factor),
        carbs: round((food.carbs || 0) * factor),
        fat: round((food.fat || 0) * factor),
        gi,
        gl: computeGL(gi, (food.carbs || 0) * factor),
    }
}

// Human unit label for a food (e.g. "150g", "2", "250ml").
// (utils/nutrition.js -> formatQty)
export function formatQty(food, qty) {
    if (food.unit === 'count') return `${qty}`
    return `${qty}${food.unit}`
}

// Classify a value against a { medium, high } threshold pair -> low|medium|high.
// (utils/nutrition.js -> levelFor)
function levelFor(value, { medium, high }) {
    if (value >= high) return 'high'
    if (value >= medium) return 'medium'
    return 'low'
}

// `thresholds` is the NutritionConfig doc: { gi, glItem, glMeal }.
export const giLevel = (gi, thresholds) => levelFor(gi, thresholds.gi)
export const glItemLevel = (gl, thresholds) => levelFor(gl, thresholds.glItem)
export const glMealLevel = (gl, thresholds) => levelFor(gl, thresholds.glMeal)

// Sum GL across a meal's already-computed items (utils/nutrition.js -> mealGL).
export function mealGL(items) {
    return round(items.reduce((sum, it) => sum + (it.gl || 0), 0), 1)
}

// Sum a list of computed item macros into meal / day totals.
// Mirrors user/src/portals/client/pages/MyDiet.jsx + trainer DietPlans.jsx totals.
export function sumMacros(items) {
    const total = items.reduce(
        (acc, it) => ({
            cal: acc.cal + (it.cal || 0),
            protein: acc.protein + (it.protein || 0),
            carbs: acc.carbs + (it.carbs || 0),
            fat: acc.fat + (it.fat || 0),
            gl: acc.gl + (it.gl || 0),
        }),
        { cal: 0, protein: 0, carbs: 0, fat: 0, gl: 0 },
    )
    return {
        cal: Math.round(total.cal),
        protein: round(total.protein),
        carbs: round(total.carbs),
        fat: round(total.fat),
        gl: round(total.gl),
    }
}
