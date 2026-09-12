import { loadData } from './loadJson.js'
import { env } from '../config/env.js'
import { hashPassword } from '../utils/password.js'
import { ensureReferralCode } from '../services/referral.service.js'
import {
    User, Trainer, Client, Referral,
    DietPlan, ExercisePlan, Payment, WeightEntry, FollowUp,
} from '../models/index.js'
import { PLAN_PRICES } from '../config/constants.js'

// Demo dataset distilled from the front-end mock files:
//   admin/src/services/mockData.js   (trainers, capacities, revenue)
//   trainer/src/services/mockData.js (clientSeed, sampleExercisePlan)
//   user/src/services/mockData.js    (dietPlan, exercisePlan, weightProgress)
//   data/referrals.json              (trainer referral codes + referral records)

// admin mockData trainers[] — keyed by the referrals.json trainer id.
const TRAINER_META = {
    'TR-1001': { specialization: 'Strength & Conditioning', capacity: 25, rating: 4.9, revenue: 48200, status: 'active', avatarColor: '#0b2545' },
    'TR-1002': { specialization: 'Weight Loss & Nutrition', capacity: 20, rating: 4.8, revenue: 51900, status: 'active', avatarColor: '#7c3aed' },
    'TR-1003': { specialization: 'Bodybuilding', capacity: 30, rating: 4.7, revenue: 39750, status: 'active', avatarColor: '#047857' },
    'TR-1004': { specialization: 'Yoga & Mobility', capacity: 18, rating: 4.9, revenue: 27600, status: 'active', avatarColor: '#be123c' },
    'TR-1005': { specialization: 'Endurance & Running', capacity: 22, rating: 4.5, revenue: 15400, status: 'inactive', avatarColor: '#b45309' },
    'TR-1006': { specialization: 'Functional Training', capacity: 24, rating: 4.8, revenue: 44100, status: 'active', avatarColor: '#0f766e' },
}

// trainer mockData clientSeed
const CLIENT_SEED = [
    { name: 'Emma Thompson', goal: 'Fat Loss', plan: 'Elite', progress: 82, weight: 68, target: 62, startWeight: 74, attention: false },
    { name: 'Noah Carter', goal: 'Muscle Gain', plan: 'Premium', progress: 74, weight: 78, target: 85, startWeight: 76, attention: true },
    { name: 'Olivia Reyes', goal: 'Body Recomposition', plan: 'Standard', progress: 64, weight: 61, target: 58, startWeight: 64, attention: false },
    { name: 'James Nguyen', goal: 'Muscle Gain', plan: 'Premium', progress: 90, weight: 74, target: 72, startWeight: 77, attention: false },
    { name: 'Ava Patel', goal: 'Fat Loss', plan: 'Standard', progress: 48, weight: 82, target: 70, startWeight: 88, attention: true },
    { name: 'William Rossi', goal: 'Muscle Gain', plan: 'Elite', progress: 71, weight: 88, target: 95, startWeight: 84, attention: false },
    { name: 'Isabella Kowalski', goal: 'Busy Moms', plan: 'Starter', progress: 55, weight: 65, target: 63, startWeight: 68, attention: false },
    { name: 'Ethan Andersen', goal: 'Fat Loss', plan: 'Premium', progress: 38, weight: 95, target: 82, startWeight: 101, attention: true },
    { name: 'Mia Silva', goal: 'Body Recomposition', plan: 'Standard', progress: 79, weight: 58, target: 55, startWeight: 61, attention: false },
    { name: 'Lucas Murphy', goal: 'Muscle Gain', plan: 'Elite', progress: 86, weight: 80, target: 88, startWeight: 76, attention: false },
    { name: 'Charlotte Haddad', goal: 'PCOS', plan: 'Premium', progress: 67, weight: 63, target: 60, startWeight: 66, attention: false },
    { name: 'Henry Larsen', goal: 'Diabetic Patients', plan: 'Starter', progress: 42, weight: 90, target: 84, startWeight: 94, attention: true },
]

// user mockData dietPlan (Emma / CL-2001) — meals reference the food library by code.
const DEMO_DIET_PLAN = {
    title: 'Fat Loss — Week 6',
    meals: [
        { name: 'Breakfast', time: '08:00', notes: 'Have within 30 min of waking.', items: [
            { foodCode: 'F-egg-white', qty: 132 }, { foodCode: 'F-oats', qty: 60 }, { foodCode: 'F-blueberries', qty: 80 },
        ] },
        { name: 'Snack', time: '11:00', notes: '', items: [
            { foodCode: 'F-greek-yogurt', qty: 150 }, { foodCode: 'F-almonds', qty: 15 },
        ] },
        { name: 'Lunch', time: '13:00', notes: '', items: [
            { foodCode: 'F-chicken-breast', qty: 150 }, { foodCode: 'F-brown-rice', qty: 120 }, { foodCode: 'F-mixed-greens', qty: 100 },
        ] },
        { name: 'Dinner', time: '19:30', notes: 'Add greens if still hungry.', items: [
            { foodCode: 'F-salmon', qty: 140 }, { foodCode: 'F-sweet-potato', qty: 150 },
        ] },
    ],
}

// user mockData exercisePlan (Emma) — mirrors trainer sampleExercisePlan.
const DEMO_EXERCISE_PLAN = {
    title: 'Push / Pull / Legs',
    days: [
        { day: 'Monday', focus: 'Chest & Triceps', exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s', youtube: 'https://youtube.com/watch?v=rT7DgCr-3pg', instructions: 'Control the eccentric.' },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '75s', technique: 'tut', instructions: 'Slight arch, full range.' },
            { name: 'Cable Fly', sets: 3, reps: '12-15', rest: '60s', technique: 'superset', instructions: 'Squeeze at the top.' },
            { name: 'Rope Pushdown', sets: 3, reps: '12', rest: '60s', technique: 'superset', instructions: 'Elbows tucked.' },
        ] },
        { day: 'Wednesday', focus: 'Back & Biceps', exercises: [
            { name: 'Deadlift', sets: 4, reps: '5', rest: '120s', youtube: 'https://youtube.com/watch?v=op9kVnSso6Q', instructions: 'Brace hard.' },
            { name: 'Pull-ups', sets: 3, reps: 'AMRAP', rest: '90s', instructions: 'Full hang to chin over bar.' },
            { name: 'Barbell Row', sets: 3, reps: '10', rest: '75s', instructions: 'Flat back, pull to hips.' },
        ] },
        { day: 'Friday', focus: 'Legs', exercises: [
            { name: 'Back Squat', sets: 4, reps: '8', rest: '120s', youtube: 'https://youtube.com/watch?v=ultWZbUMPL8', instructions: 'Depth below parallel.' },
            { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: '90s', instructions: 'Feel the hamstring stretch.' },
            { name: 'Leg Press', sets: 3, reps: '12', rest: '75s', instructions: 'Controlled tempo.' },
        ] },
    ],
}

const DEMO_WEIGHTS = [74, 73.1, 72.4, 71.5, 70.6, 69.8, 68.7, 68] // user mockData weightProgress

async function upsertUser({ name, email, role, avatarColor, status = 'active' }) {
    let user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
        user = await User.create({
            name, email, role, avatarColor, status,
            passwordHash: await hashPassword(env.seedDemoPassword),
        })
    } else {
        user.name = name
        user.role = role
        if (avatarColor) user.avatarColor = avatarColor
        user.status = status
        await user.save()
    }
    return user
}

export async function seedDemoData() {
    const registry = await loadData('referrals.json')

    // ---- Admin ----
    await upsertUser({
        name: 'Alexandra Reed',
        email: 'alexandra.reed@fittrack.io',
        role: 'admin',
        avatarColor: '#0b2545',
    })

    // ---- Trainers ----
    const trainerByLegacyId = new Map()
    for (const t of registry.trainers) {
        const meta = TRAINER_META[t.id] || { specialization: 'General Fitness', capacity: 20, rating: 5, revenue: 0, status: 'active' }
        const user = await upsertUser({
            name: t.name,
            email: t.email,
            role: 'trainer',
            avatarColor: meta.avatarColor,
            status: meta.status,
        })
        let trainer = await Trainer.findOne({ user: user._id })
        if (!trainer) trainer = new Trainer({ user: user._id })
        trainer.specialization = meta.specialization
        trainer.capacity = meta.capacity
        trainer.rating = meta.rating
        trainer.revenue = meta.revenue
        trainer.status = meta.status
        trainer.referralCode = t.code // data/referrals.json — issued once, verbatim
        await trainer.save()
        trainerByLegacyId.set(t.id, trainer)
    }

    // ---- Referral records ----
    for (const r of registry.referrals) {
        const referrer = trainerByLegacyId.get(r.referrerId)
        const referee = trainerByLegacyId.get(r.refereeId)
        if (!referrer || !referee) continue
        await Referral.updateOne(
            { referee: referee._id },
            {
                $set: {
                    referrer: referrer._id,
                    referee: referee._id,
                    code: r.code,
                    date: new Date(r.date),
                    status: r.status,
                },
            },
            { upsert: true },
        )
        if (r.status === 'joined' && !referee.referredBy) {
            referee.referredBy = referrer._id
            await referee.save()
        }
    }

    // ---- Clients (round-robin across active trainers) ----
    const activeTrainers = [...trainerByLegacyId.values()].filter((t) => t.status === 'active')
    const createdClients = []
    for (let i = 0; i < CLIENT_SEED.length; i += 1) {
        const seed = CLIENT_SEED[i]
        const [first, last] = seed.name.split(' ')
        const email = `${first}.${last}@gmail.com`.toLowerCase()
        const trainer = activeTrainers[i % activeTrainers.length]

        const user = await upsertUser({
            name: seed.name,
            email,
            role: 'client',
            avatarColor: TRAINER_META[`TR-100${(i % 6) + 1}`]?.avatarColor || '#2563eb',
            status: seed.progress < 45 ? 'inactive' : 'active',
        })
        let client = await Client.findOne({ user: user._id })
        if (!client) client = new Client({ user: user._id })
        client.trainer = trainer._id
        client.goal = seed.goal
        client.plan = seed.plan
        client.progress = seed.progress
        client.startWeight = seed.startWeight
        client.weight = seed.weight
        client.target = seed.target
        client.status = seed.progress < 45 ? 'inactive' : 'active'
        await client.save()
        createdClients.push(client)
    }

    // ---- Keep denormalised trainer.clientCount honest ----
    for (const trainer of trainerByLegacyId.values()) {
        trainer.clientCount = await Client.countDocuments({ trainer: trainer._id })
        await trainer.save()
    }

    // ---- Published diet + exercise plan for the first client (Emma) ----
    const emma = createdClients[0]
    if (emma) {
        const emmaTrainer = emma.trainer

        if (!(await DietPlan.exists({ client: emma._id }))) {
            // normalizeMeals lives in a controller; inline the same linking here.
            const { Food } = await import('../models/index.js')
            const codes = DEMO_DIET_PLAN.meals.flatMap((m) => m.items.map((it) => it.foodCode))
            const foods = await Food.find({ code: { $in: codes } })
            const byCode = new Map(foods.map((f) => [f.code, f]))
            await DietPlan.create({
                client: emma._id,
                trainer: emmaTrainer,
                title: DEMO_DIET_PLAN.title,
                status: 'published',
                publishedAt: new Date(),
                days: [{
                    day: 'Everyday',
                    meals: DEMO_DIET_PLAN.meals.map((m) => ({
                        name: m.name, time: m.time, notes: m.notes, taskKey: `meal:${m.name.toLowerCase()}`,
                        items: m.items
                            .filter((it) => byCode.has(it.foodCode))
                            .map((it) => ({ food: byCode.get(it.foodCode)._id, foodCode: it.foodCode, qty: it.qty })),
                    })),
                }],
            })
        }

        if (!(await ExercisePlan.exists({ client: emma._id }))) {
            const { Exercise } = await import('../models/index.js')
            const plan = await ExercisePlan.create({
                client: emma._id,
                trainer: emmaTrainer,
                title: DEMO_EXERCISE_PLAN.title,
                status: 'published',
                publishedAt: new Date(),
                days: await Promise.all(
                    DEMO_EXERCISE_PLAN.days.map(async (d) => ({
                        day: d.day,
                        focus: d.focus,
                        exercises: await Promise.all(
                            d.exercises.map(async (e) => {
                                const ref = await Exercise.findOne({ name: e.name, isMaster: true })
                                return {
                                    exercise: ref?._id || null,
                                    exerciseCode: ref?.code || null,
                                    name: e.name,
                                    sets: e.sets,
                                    reps: e.reps,
                                    rest: e.rest,
                                    technique: e.technique || 'standard',
                                    youtube: e.youtube || ref?.youtube || '',
                                    instructions: e.instructions || '',
                                    done: false,
                                }
                            }),
                        ),
                    })),
                ),
            })
            plan.todayDayId = plan.days[0]?._id || null
            await plan.save()
        }

        if (!(await WeightEntry.exists({ client: emma._id }))) {
            const base = new Date()
            base.setDate(base.getDate() - 7 * DEMO_WEIGHTS.length)
            await WeightEntry.insertMany(
                DEMO_WEIGHTS.map((w, idx) => {
                    const d = new Date(base)
                    d.setDate(d.getDate() + idx * 7)
                    return { client: emma._id, date: d, weightKg: w, label: `W${idx + 1}`, source: 'client' }
                }),
            )
        }
    }

    // ---- Follow-ups: one per client ----
    for (const client of createdClients) {
        if (await FollowUp.exists({ client: client._id })) continue
        const d = new Date()
        d.setDate(d.getDate() + (Math.floor(Math.random() * 9) - 3))
        await FollowUp.create({
            trainer: client.trainer,
            client: client._id,
            date: d,
            note: 'Weekly progress review',
            bucket: 'upcoming',
        })
    }

    // ---- Payments: ~3 per client over the last 6 months ----
    if ((await Payment.countDocuments()) === 0) {
        const statuses = ['paid', 'paid', 'paid', 'pending', 'failed', 'refunded']
        const methods = ['Visa •••• 4242', 'Mastercard •••• 5518', 'PayPal', 'Apple Pay', 'Bank Transfer']
        const rows = []
        for (const client of createdClients) {
            for (let m = 0; m < 3; m += 1) {
                const date = new Date()
                date.setMonth(date.getMonth() - m)
                rows.push({
                    client: client._id,
                    trainer: client.trainer,
                    plan: client.plan,
                    amount: PLAN_PRICES[client.plan],
                    date,
                    status: m === 0 ? statuses[Math.floor(Math.random() * statuses.length)] : 'paid',
                    method: methods[Math.floor(Math.random() * methods.length)],
                    txnId: `txn_${Math.floor(Math.random() * 900000 + 100000)}_${client._id}_${m}`,
                })
            }
        }
        await Payment.insertMany(rows)
    }

    return {
        admins: 1,
        trainers: trainerByLegacyId.size,
        clients: createdClients.length,
        referrals: registry.referrals.length,
        demoPassword: env.seedDemoPassword,
    }
}
