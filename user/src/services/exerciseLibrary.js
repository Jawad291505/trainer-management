// Training techniques (Standard / TUT / Super Set) — the shared, data-driven
// enum every exercise carries. The client app keeps no copy of the exercise
// library itself (it only ever sees its own assigned plan), but it does need
// the technique labels to display what the trainer prescribed. Sourced from the
// same /data/exerciseTechniques.json the admin and trainer apps read.

import techniqueData from '@data/exerciseTechniques.json'

export const exerciseTechniques = techniqueData.items

// Always resolves to a technique object; unknown/missing keys fall back to
// Standard so exercises without the field still render.
export function getTechnique(key) {
    return exerciseTechniques.find((t) => t.key === key) || exerciseTechniques[0]
}
