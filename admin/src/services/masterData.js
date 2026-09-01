// Master / library data — the central source managed by the Admin.
// The raw data lives in src/data/*.json, which are mirrors of the canonical
// files in the repo-root /data folder (built from the Fit360OS PDFs).
// Trainers read this library when building client plans; they never recreate it.

import exercisesData from '../data/exercises.json'
import foodData from '../data/foodLibrary.json'
import generalDietPlansData from '../data/generalDietPlans.json'
import { slugify } from '../utils/slugify'

export { slugify }

export const MAX_GENERAL_DIET_PLANS = 4

// ---- Exercise library (grouped by muscle group / category) ----
// Group: { category (display name), slug (stable key), exercises: [...] }
// Each exercise: { name, target, equipment, sets, reps, rest, description, video }
export const exerciseLibrary = exercisesData.categories

export const exerciseCategories = exerciseLibrary.map((g) => g.category)

// Name + stable slug for every category — use the slug as the reference key.
export const exerciseCategoryOptions = exerciseLibrary.map((g) => ({
    name: g.category,
    slug: g.slug || slugify(g.category),
}))

// Flat list with the category name + slug attached — handy for lookups / selects.
export const allExercises = exerciseLibrary.flatMap((g) =>
    g.exercises.map((e) => ({ ...e, category: g.category, categorySlug: g.slug || slugify(g.category) })),
)

// Accepts a category display name OR its slug.
export function getExercisesByCategory(categoryOrSlug) {
    const key = String(categoryOrSlug ?? '')
    return (
        exerciseLibrary.find((g) => g.category === key || g.slug === key || slugify(g.category) === slugify(key))
            ?.exercises ?? []
    )
}

// ---- Food library (grouped by category, with default serving + macros) ----
// Group: { category (display name), slug (stable key), foods: [...] }
// Each food: { food, qty, grams, cal, protein, carbs, fat, fiber }
export const foodLibrary = foodData.categories

export const foodCategories = foodLibrary.map((g) => g.category)

export const foodCategoryOptions = foodLibrary.map((g) => ({
    name: g.category,
    slug: g.slug || slugify(g.category),
}))

export const allFoods = foodLibrary.flatMap((g) =>
    g.foods.map((f) => ({ ...f, category: g.category, categorySlug: g.slug || slugify(g.category) })),
)

// Accepts a category display name OR its slug.
export function getFoodsByCategory(categoryOrSlug) {
    const key = String(categoryOrSlug ?? '')
    return (
        foodLibrary.find((g) => g.category === key || g.slug === key || slugify(g.category) === slugify(key))
            ?.foods ?? []
    )
}

// ---- General Diet Plans (templates, max 4) ----
// Admin builds these from the food library. Trainers load one as a starting
// point for a client's plan; selecting a template COPIES its meals.
export const generalDietPlans = generalDietPlansData

// Deep-copy a general plan's meals into fresh client-plan meal objects.
// Used when a trainer picks a template — the master template is never mutated.
export function instantiateGeneralPlan(planId, makeId = (i) => `M${Date.now()}${i}`) {
    const plan = generalDietPlans.find((p) => p.id === planId)
    if (!plan) return []
    return plan.meals.map((m, i) => ({
        id: makeId(i),
        name: m.name,
        time: m.time,
        notes: m.notes || '',
        items: m.items.map((it) => ({
            food: it.food,
            amount: it.amount ?? 1,
            unit: it.unit || '',
            cal: it.cal || 0,
            protein: it.protein || 0,
            carbs: it.carbs || 0,
            fat: it.fat || 0,
        })),
    }))
}
