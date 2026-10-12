// Exercise plans carry NO numeric master-data calculation (no MET / calorie
// burn anywhere in the source apps). The only derived figure is completion
// percentage from the per-exercise `done` checkbox — mirrors the trainer's
// "Completed / Not completed / Completion %" view (plan.md section 27) and the
// client's per-day workout progress.
export function summarizeExercisePlan(plan) {
    const days = plan.days.map((day) => {
        const total = day.exercises.length
        const done = day.exercises.filter((e) => e.done).length
        return {
            id: String(day._id),
            day: day.day,
            focus: day.focus,
            note: day.note || '',
            exercises: day.exercises,
            total,
            done,
            completionPct: total ? Math.round((done / total) * 100) : 0,
        }
    })

    const total = days.reduce((s, d) => s + d.total, 0)
    const done = days.reduce((s, d) => s + d.done, 0)

    return {
        days,
        totalExercises: total,
        doneExercises: done,
        completionPct: total ? Math.round((done / total) * 100) : 0,
    }
}

// ---- Techniques + linked exercises -----------------------------------------

const snapshotOf = (t) => ({ technique: t.technique || null, title: t.title, instructions: t.instructions || '', youtube: t.youtube || '' })

// Builds the function that turns an incoming `techniques` array (on a plan
// exercise or a link group) into stored snapshots.
//
//   - An entry carrying the `_id` of a snapshot already on this plan is kept
//     exactly as stored — re-saving a plan never pulls in later library edits,
//     and still works after the library technique was deleted.
//   - Any other entry names a library technique (`technique` id), which must be
//     shared or the trainer's own; it is copied as it is right now.
//
// `Technique` is injected (as in computeWorkoutAdherence) to keep this file free
// of model imports.
export async function createTechniqueResolver(days, { plan, trainerId, max }, { Technique, isValidId, badRequest }) {
    const stored = new Map()
    for (const day of plan?.days || []) {
        for (const list of [...day.exercises.map((e) => e.techniques), ...(day.links || []).map((l) => l.techniques)]) {
            for (const t of list || []) stored.set(String(t._id), t)
        }
    }

    const incoming = days.flatMap((d) => [
        ...(d.exercises || []).map((e) => e.techniques),
        ...(Array.isArray(d.links) ? d.links : []).map((l) => l?.techniques),
    ]).flatMap((list) => (Array.isArray(list) ? list : []))

    const wanted = new Set()
    for (const t of incoming) {
        if (t?._id && stored.has(String(t._id))) continue
        if (!t?.technique || !isValidId(t.technique)) throw badRequest('Invalid technique selection')
        wanted.add(String(t.technique))
    }

    const library = new Map()
    if (wanted.size) {
        const found = await Technique.find({
            _id: { $in: [...wanted] },
            $or: [{ isMaster: true }, { owner: trainerId }],
        })
        for (const t of found) library.set(String(t._id), t)
        if (library.size !== wanted.size) {
            throw badRequest('A selected technique is no longer available — remove it from the exercise and try again')
        }
    }

    return (list) => {
        const out = []
        const seen = new Set()
        for (const t of Array.isArray(list) ? list : []) {
            const kept = t._id ? stored.get(String(t._id)) : null
            const lib = kept ? null : library.get(String(t.technique))
            const snap = kept
                ? { _id: kept._id, ...snapshotOf(kept) }
                : { technique: lib._id, title: lib.title, instructions: lib.instructions, youtube: lib.youtube }
            const dedupeKey = String(snap.technique || snap._id)
            if (seen.has(dedupeKey)) continue
            seen.add(dedupeKey)
            out.push(snap)
        }
        if (out.length > max) throw badRequest(`An exercise can carry at most ${max} techniques`)
        return out
    }
}

// Settles one day's link groups: a group needs at least two member exercises,
// otherwise it is dropped and its members become standalone. Members are pulled
// together at the position of the group's first exercise (keeping their relative
// order) so every reader can rely on a group being contiguous. Exercises are
// only regrouped — never copied or removed.
export function normalizeLinks(exercises, links, { types, resolveTechniques }) {
    const members = new Map()
    for (const ex of exercises) {
        if (!ex.linkKey) continue
        if (!members.has(ex.linkKey)) members.set(ex.linkKey, [])
        members.get(ex.linkKey).push(ex)
    }

    const kept = []
    const live = new Set()
    for (const link of Array.isArray(links) ? links : []) {
        const key = String(link?.key || '').trim()
        if (!key || live.has(key) || (members.get(key) || []).length < 2) continue
        live.add(key)
        kept.push({
            key,
            type: types.includes(link.type) ? link.type : types[0],
            note: String(link.note || '').trim().slice(0, 300),
            techniques: resolveTechniques(link.techniques),
        })
    }

    const ordered = []
    const placed = new Set()
    for (const ex of exercises) {
        if (!ex.linkKey || !live.has(ex.linkKey)) {
            ordered.push({ ...ex, linkKey: null })
        } else if (!placed.has(ex.linkKey)) {
            placed.add(ex.linkKey)
            ordered.push(...members.get(ex.linkKey))
        }
    }
    return { exercises: ordered, links: kept }
}
