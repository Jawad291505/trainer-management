// Predefined exercise library created by the admin.
//
// The data lives at the workspace root in /data/exerciseLibrary.json so it is a
// single shared source of truth for BOTH the admin and trainer apps. Admins
// manage these entries; trainers read them here and can create their own on top
// (see context/LibraryContext). When a backend arrives the JSON import simply
// becomes an API call.

import exerciseData from '@data/exerciseLibrary.json'

export const exerciseCategories = exerciseData.categories

export const exerciseLibrary = exerciseData.items

export function getExercise(id) {
    return exerciseLibrary.find((x) => x.id === id)
}
