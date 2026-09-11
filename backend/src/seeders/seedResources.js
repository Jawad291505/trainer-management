/**
 * Seed library resources (admin external links).
 * Usage:  node src/seeders/seedResources.js
 */
import { connectDb, disconnectDb } from '../config/db.js'
import { LibraryResource } from '../models/index.js'

const RESOURCES = [
    { title: 'Full Body Strength Program (12 Weeks)', category: 'Workout Guides', description: 'Progressive overload plan with weekly splits and video demos.', url: 'https://drive.google.com/fittrack/strength-12w', status: 'active' },
    { title: 'Fat Loss Nutrition Handbook', category: 'Nutrition Guides', description: 'Calorie targets, macro splits and 40 high-protein recipes.', url: 'https://drive.google.com/fittrack/fatloss-nutrition', status: 'active' },
    { title: 'Perfect Squat Form Breakdown', category: 'Exercise Videos', description: 'Frame-by-frame coaching cues for depth and bracing.', url: 'https://youtube.com/watch?v=fittrack-squat', status: 'active' },
    { title: 'Client Onboarding Checklist', category: 'Documents', description: 'Intake form, PAR-Q and consent templates.', url: 'https://drive.google.com/fittrack/onboarding', status: 'active' },
    { title: 'Understanding Macronutrients', category: 'Educational Resources', description: 'Explainer on protein, carbs and fats for beginners.', url: 'https://drive.google.com/fittrack/macros-101', status: 'active' },
    { title: 'Mobility & Recovery Routines', category: 'Workout Guides', description: 'Daily 15-minute mobility flows for desk workers.', url: 'https://drive.google.com/fittrack/mobility', status: 'active' },
    { title: 'Meal Prep Masterclass', category: 'Nutrition Guides', description: 'Batch cooking systems for a full week in 90 minutes.', url: 'https://youtube.com/watch?v=fittrack-mealprep', status: 'active' },
    { title: 'Deadlift Setup & Safety', category: 'Exercise Videos', description: 'Hip hinge mechanics and common mistakes to avoid.', url: 'https://youtube.com/watch?v=fittrack-deadlift', status: 'active' },
]

async function main() {
    await connectDb()
    console.log('[seedResources] connected')

    let created = 0
    for (const r of RESOURCES) {
        const exists = await LibraryResource.findOne({ title: r.title })
        if (!exists) {
            await LibraryResource.create(r)
            created++
        }
    }

    console.log(`[seedResources] ${created} resources created (${RESOURCES.length - created} already existed)`)
    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error('[seedResources] failed:', err)
    process.exit(1)
})
