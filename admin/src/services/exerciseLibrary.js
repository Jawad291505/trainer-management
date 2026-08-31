// Shared exercise library — single source of truth at
// /data/exerciseLibrary.json, consumed by both the admin and trainer apps. The
// admin manages these entries; trainers read them. When a backend arrives, swap
// the JSON import for an API.

import exerciseData from '@data/exerciseLibrary.json'

export const exerciseCategories = exerciseData.categories
export const exerciseSeed = exerciseData.items
