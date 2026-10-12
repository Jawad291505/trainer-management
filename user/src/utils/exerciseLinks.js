// Linked exercises — two or more exercises of one training day performed
// together. A day carries `links: [{ key, type, note, techniques }]` and each
// member exercise carries that `key` in `linkKey`; the order within a group is
// the order of the day's `exercises` array. Linking never copies an exercise.

// Mirrors the backend's EXERCISE_LINK_TYPES.
export const LINK_TYPES = [
    { value: 'superset', label: 'Superset', hint: 'Back-to-back with no rest in between' },
    { value: 'paired', label: 'Paired movements', hint: 'Two movements trained together as a pair' },
    { value: 'sequence', label: 'Technique sequence', hint: 'Steps performed one after another, in order' },
]

export const getLinkType = (value) => LINK_TYPES.find((t) => t.value === value) || LINK_TYPES[0]

// Splits a day's exercises into display blocks, in order:
//   { link: null, exercises: [ex] }          a standalone exercise
//   { link: {...}, exercises: [ex, ex, …] }  a link group
// A "group" left with a single member is treated as standalone.
export function groupLinked(exercises = [], links = []) {
    const byKey = new Map((links || []).map((l) => [l.key, l]))
    const blocks = []
    const open = new Map()
    for (const ex of exercises) {
        const link = ex.linkKey ? byKey.get(ex.linkKey) : null
        if (!link) {
            blocks.push({ link: null, exercises: [ex] })
            continue
        }
        let block = open.get(link.key)
        if (!block) {
            block = { link, exercises: [] }
            open.set(link.key, block)
            blocks.push(block)
        }
        block.exercises.push(ex)
    }
    return blocks.map((b) => (b.link && b.exercises.length < 2 ? { link: null, exercises: b.exercises } : b))
}
