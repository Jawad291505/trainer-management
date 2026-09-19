// Shared food library — single source of truth at /data/foodLibrary.json,
// consumed by both the admin and trainer apps. The admin manages these entries;
// trainers read them. When a backend arrives, swap the JSON import for an API.

// Named imports (not the default object) so the bundler drops the unused `items`
// array — the actual foods are served by the API.
import { categories, thresholds } from '@data/foodLibrary.json'

export const foodCategories = categories
export const glycemicThresholds = thresholds

export const foodUnits = [
    { value: 'g', label: 'Grams (g)' },
    { value: 'ml', label: 'Millilitres (ml)' },
    { value: 'count', label: 'Count' },
]
