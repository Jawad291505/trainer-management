import { Exercise, Food, NutritionConfig } from '../models/index.js'
import { createMasterListCache } from '../utils/masterListCache.js'

// Shared in-memory copies of slow-changing reference data (see utils/masterListCache.js).
// Every read that would otherwise cost an Atlas round trip on the request path goes
// through here; the controllers that edit the data call the matching invalidate().
export const masterExercises = createMasterListCache(Exercise, { sort: { name: 1 } })
export const masterFoods = createMasterListCache(Food, { sort: { name: 1 } })

// GI / GL threshold config — one small document read by every plan render.
const STALE_MS = 5 * 60_000
let thresholds = null
let thresholdsAt = 0
let thresholdsLoad = null
let thresholdsVersion = 0

function loadThresholds() {
    if (!thresholdsLoad) {
        const startedAt = thresholdsVersion
        const pending = NutritionConfig.getDefault()
            .then((cfg) => {
                if (startedAt === thresholdsVersion) {
                    thresholds = cfg
                    thresholdsAt = Date.now()
                }
                return cfg
            })
            .finally(() => { if (thresholdsLoad === pending) thresholdsLoad = null })
        thresholdsLoad = pending
    }
    return thresholdsLoad
}

export async function getThresholds() {
    if (!thresholds) return loadThresholds()
    if (Date.now() - thresholdsAt > STALE_MS) loadThresholds().catch(() => {})
    return thresholds
}

export function invalidateThresholds() {
    thresholdsVersion += 1
    thresholds = null
    thresholdsAt = 0
    thresholdsLoad = null
}

// Resolve foods by code: masters come from memory; only codes not found there
// (trainer-custom foods) cost a database query.
export async function getFoodsByCode(codes) {
    const byCode = new Map()
    if (!codes.length) return byCode
    const wanted = new Set(codes)
    for (const f of await masterFoods.get()) if (wanted.has(f.code)) byCode.set(f.code, f)
    const missing = codes.filter((c) => !byCode.has(c))
    if (missing.length) {
        for (const f of await Food.find({ code: { $in: missing } })) byCode.set(f.code, f)
    }
    return byCode
}

// Fire-and-forget fill for server start-up.
export function warmLibraryCaches() {
    return Promise.all([masterExercises.warm(), masterFoods.warm(), loadThresholds().catch(() => {})])
}
