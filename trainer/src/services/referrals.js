// Trainer-to-trainer referrals.
//
// The registry lives at the workspace root in /data/referrals.json so it is a
// single shared source of truth for the admin and trainer apps. When a backend
// arrives the JSON import simply becomes an API call.
//
// A trainer's referral code is generated exactly ONCE. If the shared registry
// already lists a code for the signed-in trainer we use that; otherwise we mint
// one on first visit and pin it to localStorage so it never changes again.
// "Who referred you" is likewise a one-time action — once a code is redeemed it
// is locked.

import registry from '@data/referrals.json'
import { currentTrainer } from './mockData'

const CODE_KEY = 'fittrack.trainer.referralCode'
const REFERRED_BY_KEY = 'fittrack.trainer.referredBy'
// Extra referrals made by this trainer during the session (code redemptions that
// happened after the seed was authored). Kept so the "Trainers you referred"
// list can grow in the demo without a backend.
const MADE_KEY = 'fittrack.trainer.referralsMade'

export const referralTrainers = registry.trainers
export const referralSeed = registry.referrals

export function trainerById(id) {
    return referralTrainers.find((t) => t.id === id) || null
}

export function trainerByCode(code) {
    const norm = String(code || '').trim().toUpperCase()
    if (!norm) return null
    return referralTrainers.find((t) => t.code.toUpperCase() === norm) || null
}

function readJSON(key, fallback) {
    if (typeof window === 'undefined') return fallback
    try {
        const raw = localStorage.getItem(key)
        return raw ? JSON.parse(raw) : fallback
    } catch {
        return fallback
    }
}

function writeJSON(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value))
    } catch {
        /* storage unavailable */
    }
}

// A readable NAME-XXXX code. The suffix is 4 base-36 chars so codes are short,
// case-insensitive and unambiguous enough for a demo.
function generateCode(name) {
    const prefix = (name || 'TRAINER').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').slice(0, 8) || 'TRAINER'
    let suffix = ''
    for (let i = 0; i < 4; i += 1) {
        suffix += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]
    }
    return `${prefix}-${suffix}`
}

// The signed-in trainer's permanent referral code. Generated once, then pinned.
export function getMyCode() {
    if (typeof window !== 'undefined') {
        try {
            const pinned = localStorage.getItem(CODE_KEY)
            if (pinned) return pinned
        } catch {
            /* storage unavailable */
        }
    }
    const code = trainerById(currentTrainer.id)?.code || generateCode(currentTrainer.name)
    try {
        localStorage.setItem(CODE_KEY, code)
    } catch {
        /* storage unavailable */
    }
    return code
}

// The trainer who referred the signed-in trainer, or null. Checks the shared
// seed first, then a locally redeemed code.
export function getReferredBy() {
    const seeded = referralSeed.find((r) => r.refereeId === currentTrainer.id)
    if (seeded) {
        const t = trainerById(seeded.referrerId)
        return t ? { ...t, date: seeded.date, source: 'seed' } : null
    }
    const local = readJSON(REFERRED_BY_KEY, null)
    if (local) {
        const t = trainerByCode(local.code)
        return t ? { ...t, date: local.date, source: 'local' } : null
    }
    return null
}

// Redeem a referral code from another trainer. One-time only.
// Returns { ok: true, referrer } or { ok: false, error }.
export function redeemCode(code) {
    if (getReferredBy()) return { ok: false, error: 'You have already been referred by a trainer.' }
    const referrer = trainerByCode(code)
    if (!referrer) return { ok: false, error: 'That referral code was not recognised.' }
    if (referrer.id === currentTrainer.id) return { ok: false, error: 'You cannot redeem your own referral code.' }
    const record = { code: referrer.code, referrerId: referrer.id, date: new Date().toISOString().slice(0, 10) }
    writeJSON(REFERRED_BY_KEY, record)
    return { ok: true, referrer: { ...referrer, date: record.date } }
}

// Trainers the signed-in trainer has referred (redeemed this trainer's code).
export function getMyReferrals() {
    const fromSeed = referralSeed
        .filter((r) => r.referrerId === currentTrainer.id)
        .map((r) => ({ ...r, referee: trainerById(r.refereeId) }))
    const local = readJSON(MADE_KEY, [])
    return [...local, ...fromSeed]
}
