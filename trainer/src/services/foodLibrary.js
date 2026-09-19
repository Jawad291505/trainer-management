// Predefined food library for diet-plan building.
//
// The data itself lives at the workspace root in /data/foodLibrary.json so it
// is a single shared source of truth for BOTH the admin and trainer apps.
// Admins manage these entries; trainers read them here and can layer their own
// custom foods on top (see context/LibraryContext). When a backend arrives the
// JSON import simply becomes an API call.
//
// Food fields:
//   id         - stable identifier (maps to a DB primary key later)
//   name       - display name
//   category   - grouping used for the picker (Protein, Carb, Fat, ...)
//   unit       - 'g' (grams) | 'ml' (millilitres) | 'count' (whole items)
//   base       - the amount the macros below are measured against
//   step       - increment used by the quantity control
//   defaultQty - quantity pre-filled when the food is selected
//   gi         - Glycemic Index (0 when negligible, e.g. pure protein/fat)
//   cal/protein/carbs/fat - macros per `base` `unit`

// Named imports (not the default object) so the bundler drops the unused `items`
// array — the actual foods are served by the API.
import { categories, thresholds } from '@data/foodLibrary.json'

export const foodCategories = categories

// GI / GL thresholds. Sourced from the shared JSON so the admin/database can
// drive these later without touching component logic.
//   GI  (per food):  Low <= 55, Medium 56-69, High >= 70
//   GL  (per food):  Low <= 10, Medium 11-19, High >= 20
//   GL  (per meal):  summed food GL, warns past these limits
export const glycemicThresholds = thresholds
