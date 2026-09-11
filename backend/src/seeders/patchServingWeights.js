/**
 * Patch servingWeight on foods where it makes sense to add "by unit".
 * Run: node src/seeders/patchServingWeights.js
 */
import { connectDb, disconnectDb } from '../config/db.js'
import { Food } from '../models/index.js'

// Map food code -> grams per 1 serving unit
const SERVING_WEIGHTS = {
    'F-whole-egg': 50,           // 1 large egg = 50g
    'F-egg-white': 33,           // 1 egg white = 33g
    'F-apple': 182,              // 1 medium apple = 182g
    'F-banana-ripe': 118,        // 1 medium banana = 118g
    'F-orange': 131,             // 1 medium orange = 131g
    'F-corn-tortilla': 28,       // 1 tortilla = 28g
    'F-wheat-tortilla': 45,      // 1 tortilla = 45g
    'F-whole-wheat-chapati': 50, // 1 chapati = 50g
    'F-refined-flour-roti': 50,  // 1 roti = 50g
    'F-plain-naan': 60,          // 1 naan = 60g
    'F-whole-wheat-pita': 60,    // 1 pita = 60g
    'F-white-pita': 60,          // 1 pita = 60g
    'F-white-bread': 30,         // 1 slice = 30g
    'F-whole-wheat-bread': 30,   // 1 slice = 30g
    'F-multigrain-bread': 35,    // 1 slice = 35g
    'F-sourdough-bread': 40,     // 1 slice = 40g
    'F-rye-bread': 32,           // 1 slice = 32g
    'F-dates-deglet-noor': 24,   // 1 date = 24g
    'F-dates-medjool': 24,       // 1 date = 24g
    'F-chicken-breast': 150,     // 1 breast = ~150g
    'F-salmon': 140,             // 1 fillet = ~140g
}

// Also set serving labels for items that already have a base matching the weight
const SERVING_LABELS = {
    'F-whole-egg': '1 large egg',
    'F-egg-white': '1 egg white',
    'F-apple': '1 medium',
    'F-banana-ripe': '1 medium',
    'F-orange': '1 medium',
    'F-corn-tortilla': '1 tortilla',
    'F-wheat-tortilla': '1 tortilla',
    'F-whole-wheat-chapati': '1 chapati',
    'F-refined-flour-roti': '1 roti',
    'F-plain-naan': '1 naan',
    'F-whole-wheat-pita': '1 pita',
    'F-white-pita': '1 pita',
    'F-white-bread': '1 slice',
    'F-whole-wheat-bread': '1 slice',
    'F-multigrain-bread': '1 slice',
    'F-sourdough-bread': '1 slice',
    'F-rye-bread': '1 slice',
    'F-chicken-breast': '1 breast',
    'F-salmon': '1 fillet',
}

async function main() {
    await connectDb()
    console.log('[patchServingWeights] connected')

    let updated = 0
    for (const [code, weight] of Object.entries(SERVING_WEIGHTS)) {
        const patch = { servingWeight: weight }
        if (SERVING_LABELS[code]) patch.serving = SERVING_LABELS[code]
        const res = await Food.updateOne({ code }, { $set: patch })
        if (res.modifiedCount > 0) updated++
    }

    console.log(`[patchServingWeights] Updated ${updated} foods with servingWeight`)
    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error('[patchServingWeights] failed:', err)
    process.exit(1)
})
