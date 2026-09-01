// Nutrition + glycemic calculations.
//
// All macros in the food library are stored against a `base` amount. Given a
// chosen `qty`, we scale linearly. Changing the quantity therefore recalculates
// calories, protein, carbs and fats automatically for the client.

import { glycemicThresholds } from '../services/foodLibrary'

const round = (n, d = 1) => {
    const f = 10 ** d
    return Math.round(n * f) / f
}

// Scale a food's macros to the chosen quantity.
// `food` is a library entry (with base/unit/macros). Returns computed values.
export function computeNutrition(food, qty) {
    const factor = (Number(qty) || 0) / food.base
    return {
        cal: Math.round(food.cal * factor),
        protein: round(food.protein * factor),
        carbs: round(food.carbs * factor),
        fat: round(food.fat * factor),
        gi: food.gi || 0,
        gl: computeGL(food.gi || 0, food.carbs * factor),
    }
}

// Glycemic Load = (GI × available carbohydrate grams) / 100.
export function computeGL(gi, carbGrams) {
    if (!gi || !carbGrams) return 0
    return round((gi * carbGrams) / 100, 1)
}

// Human unit label for a food (e.g. "150 g", "2", "250 ml").
export function formatQty(food, qty) {
    if (food.unit === 'count') return `${qty}`
    return `${qty}${food.unit}`
}

// Classify a value against a {medium, high} threshold pair.
function levelFor(value, { medium, high }) {
    if (value >= high) return 'high'
    if (value >= medium) return 'medium'
    return 'low'
}

export function giLevel(gi) {
    return levelFor(gi, glycemicThresholds.gi)
}
export function glItemLevel(gl) {
    return levelFor(gl, glycemicThresholds.glItem)
}
export function glMealLevel(gl) {
    return levelFor(gl, glycemicThresholds.glMeal)
}

// Colour token + label for a glycemic level. Uses global CSS variables so it
// stays on-theme.
export const glycemicMeta = {
    low: { label: 'Low', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    medium: { label: 'Medium', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    high: { label: 'High', color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
}

// Sum GL across a meal's items (each item carries a `gl` value).
export function mealGL(items) {
    return round(items.reduce((sum, it) => sum + (it.gl || 0), 0), 1)
}
