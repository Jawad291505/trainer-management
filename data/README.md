# Master Data (`data/`)

This folder is the **single canonical source** for the platform's master / library data.
It is owned and edited by the **Admin**.

| File | What it is | Built from |
| --- | --- | --- |
| `exercises.json` | Global exercise library — 240 exercises in 15 categories (muscle groups, cardio, home bodyweight, warm-ups, cool-down stretches). Each category: `{ category (display name), slug (stable key), exercises: [{ name, target, equipment, sets, reps, rest, description, video }] }`. | `../Fit360OS_100_Gym_Exercises*.pdf`, `../Fit360OS_50_Home_Bodyweight_HIIT_Exercises.pdf`, `../Fit360OS_50_Warm_Up_Exercises*.pdf`, `../Fit360OS_Post_Workout_Stretching_Guide.pdf` |
| `foodLibrary.json` | Global food library — 200 foods in 8 categories. Each category: `{ category (display name), slug (stable key), foods: [{ food, amount (number), unit (label), grams, cal, protein, carbs, fat, fiber }] }`. The macros belong to that `amount` + `unit` serving. | `../Fit360OS_200_Food_Exchange_List*.pdf` (a few OCR-garbled rows corrected to standard values) |
| `generalDietPlans.json` | Up to **4** reusable General Diet Plan templates. Meal items are `{ food, amount, unit, cal, protein, carbs, fat }`. | Hand-composed from `foodLibrary.json` |

## Hierarchy

```
Admin  ──>  manages this master data
  │
Trainer ──> always reads this master data; selects items into client-specific plans
  │         (General Diet Plan = template → copies its meals into the trainer's client plan)
  │
Client ──>  only sees their own assigned, trainer-customised plans
```

## Category slugs

Every category carries a `slug` (`slugify()` of the name: lowercase, `&` → `and`,
non-alphanumerics → `-`). The slug is the **stable reference key** — when this data
moves to a database, other rows should reference the slug, not the display name, so
the name can be renamed later without breaking anything. Admin-added categories get a
slug too, and a new name whose slug matches an existing category snaps to that
category instead of creating a near-duplicate.

## Important rules

- The Library is **master data**. Trainers select from it; they never recreate it.
- Selecting a General Diet Plan **copies** its meals/foods into the trainer's client plan.
  The master template is never modified by a trainer.
- Trainer customisations live on the client's plan, separate from this folder.

## Keeping the apps in sync

The front-end apps are independent Vite projects, so the ones that need this data keep a
**verbatim copy of these JSON files** under `src/data/` plus a thin adapter at
`src/services/masterData.js`:

- `admin/src/data/*.json` + `admin/src/services/masterData.js` — Admin edits this data in the UI
- `trainer/src/data/*.json` + `trainer/src/services/masterData.js` — read-only in the UI; Trainers select from it
- `user/` keeps no copy — the Client only ever sees their own assigned, trainer-customised
  plans, which live in `user/src/services/mockData.js`.

When you change a file here, copy it into `admin/src/data/` and `trainer/src/data/`.
