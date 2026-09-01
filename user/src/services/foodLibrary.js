// Shared food library — single source of truth at /data/foodLibrary.json,
// consumed by the admin, trainer and client apps. Admins manage entries,
// trainers build plans from them, and the client reads the same data so the
// nutrition/GI-GL the client sees matches exactly what the trainer assigned.

import foodData from '@data/foodLibrary.json'

export const foodCategories = foodData.categories
export const foodLibrary = foodData.items
export const glycemicThresholds = foodData.thresholds

export function getFood(id) {
    return foodLibrary.find((f) => f.id === id)
}
