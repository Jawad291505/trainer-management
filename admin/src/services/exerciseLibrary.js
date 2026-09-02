// Shared exercise library — single source of truth at
// /data/exerciseLibrary.json, consumed by both the admin and trainer apps. The
// admin manages these entries; trainers read them. When a backend arrives, swap
// the JSON import for an API.

import exerciseData from '@data/exerciseLibrary.json'
import techniqueData from '@data/exerciseTechniques.json'

export const exerciseCategories = exerciseData.categories
export const exerciseSeed = exerciseData.items

// Training techniques (Standard / TUT / Super Set) — a shared, data-driven enum
// every exercise carries. Sourced from /data/exerciseTechniques.json so it can
// move to the database alongside the library later.
export const exerciseTechniques = techniqueData.items

// Always resolves to a technique object; unknown/missing keys fall back to
// Standard so exercises created before this field existed still render.
export function getTechnique(key) {
    return exerciseTechniques.find((t) => t.key === key) || exerciseTechniques[0]
}
