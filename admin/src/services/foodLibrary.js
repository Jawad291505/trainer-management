// Shared food library — single source of truth at /data/foodLibrary.json,
// consumed by both the admin and trainer apps. The admin manages these entries;
// trainers read them. When a backend arrives, swap the JSON import for an API.

import foodData from '@data/foodLibrary.json'

export const foodCategories = foodData.categories
export const foodSeed = foodData.items
export const glycemicThresholds = foodData.thresholds

export const foodUnits = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'ml', label: 'Millilitres (ml)' },
    { value: 'count', label: 'Count' },
]
