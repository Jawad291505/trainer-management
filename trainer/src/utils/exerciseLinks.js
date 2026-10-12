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

// ---- Builder-side edits (exercises are identified by their builder `id`) ----

let linkSeq = 0
export const newLinkKey = () => `L${Date.now().toString(36)}${linkSeq++}`

// Drops groups with fewer than two members, clears stale `linkKey`s and keeps
// every group's members next to each other.
export function tidyLinks(day) {
    const blocks = groupLinked(day.exercises, day.links)
    const live = new Set(blocks.filter((b) => b.link).map((b) => b.link.key))
    return {
        ...day,
        links: (day.links || []).filter((l) => live.has(l.key)),
        exercises: blocks.flatMap((b) => (b.link ? b.exercises : b.exercises.map((e) => (e.linkKey ? { ...e, linkKey: null } : e)))),
    }
}

// Creates or replaces the group `link.key` with `memberIds` (in that order). The
// group sits where its first member was; exercises dropped from it — or taken
// out of another group — simply become standalone again.
export function applyLink(day, link, memberIds) {
    const picked = new Set(memberIds)
    const members = memberIds
        .map((id) => day.exercises.find((e) => e.id === id))
        .filter(Boolean)
        .map((e) => ({ ...e, linkKey: link.key }))

    const exercises = []
    let placed = false
    for (const ex of day.exercises) {
        if (picked.has(ex.id)) {
            if (!placed) {
                exercises.push(...members)
                placed = true
            }
        } else {
            exercises.push(ex.linkKey === link.key ? { ...ex, linkKey: null } : ex)
        }
    }
    return tidyLinks({ ...day, exercises, links: [...(day.links || []).filter((l) => l.key !== link.key), link] })
}

// Takes one exercise out of its group (the group dissolves if one member is left).
export function removeFromLink(day, exerciseId) {
    return tidyLinks({ ...day, exercises: day.exercises.map((e) => (e.id === exerciseId ? { ...e, linkKey: null } : e)) })
}

// Unlinks a whole group; the exercises themselves stay in the day untouched.
export function unlinkGroup(day, key) {
    return tidyLinks({ ...day, links: (day.links || []).filter((l) => l.key !== key) })
}
