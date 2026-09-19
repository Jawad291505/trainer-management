// Predefined exercise library created by the admin.
//
// The data lives at the workspace root in /data/exerciseLibrary.json so it is a
// single shared source of truth for BOTH the admin and trainer apps. Admins
// manage these entries; trainers read them here and can create their own on top
// (see context/LibraryContext). When a backend arrives the JSON import simply
// becomes an API call.

// Named import so the bundler drops the unused `items` array — the actual
// exercises are served by the API.
import { categories } from '@data/exerciseLibrary.json'
import techniqueData from '@data/exerciseTechniques.json'

export const exerciseCategories = categories

// Training techniques (Standard / TUT / Super Set) — a shared, data-driven enum
// every exercise carries. Sourced from /data/exerciseTechniques.json so the
// admin/database can drive it later without touching component logic.
export const exerciseTechniques = techniqueData.items

// Always resolves to a technique object; unknown/missing keys fall back to
// Standard so exercises created before this field existed still render.
export function getTechnique(key) {
    return exerciseTechniques.find((t) => t.key === key) || exerciseTechniques[0]
}
