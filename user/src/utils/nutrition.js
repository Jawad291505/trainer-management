// Nutrition + glycemic helpers, shared shape with the trainer app so the
// client sees identical numbers for the plan their trainer built.

import { glycemicThresholds } from '../services/foodLibrary'

const round = (n, d = 1) => {
    const f = 10 ** d
    return Math.round(n * f) / f
}

// Scale a food's macros to a chosen quantity.
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

export function computeGL(gi, carbGrams) {
    if (!gi || !carbGrams) return 0
    return round((gi * carbGrams) / 100, 1)
}

export function formatQty(food, qty) {
    if (!food || food.unit === 'count') return `${qty}`
    return `${qty}${food.unit}`
}

function levelFor(value, { medium, high }) {
    if (value >= high) return 'high'
    if (value >= medium) return 'medium'
    return 'low'
}

export const giLevel = (gi) => levelFor(gi, glycemicThresholds.gi)
export const glItemLevel = (gl) => levelFor(gl, glycemicThresholds.glItem)
export const glMealLevel = (gl) => levelFor(gl, glycemicThresholds.glMeal)

export const glycemicMeta = {
    low: { label: 'Low', color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    medium: { label: 'Medium', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    high: { label: 'High', color: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
}

export function mealGL(items) {
    return round(items.reduce((sum, it) => sum + (it.gl || 0), 0), 1)
}
