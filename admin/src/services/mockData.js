// Centralized, realistic mock data for the Super Admin portal.
// Kept in one place so the UI looks real before a backend exists.

export const trainers = [
    {
        id: 'TR-1001',
        name: 'Marcus Bennett',
        email: 'marcus.bennett@fittrack.io',
        specialization: 'Strength & Conditioning',
        status: 'active',
        capacity: 25,
        clients: 22,
        joinDate: '2023-02-14',
        rating: 4.9,
        revenue: 48200,
        avatarColor: '#0b2545',
    },
    {
        id: 'TR-1002',
        name: 'Sofia Alvarez',
        email: 'sofia.alvarez@fittrack.io',
        specialization: 'Weight Loss & Nutrition',
        status: 'active',
        capacity: 20,
        clients: 20,
        joinDate: '2022-11-03',
        rating: 4.8,
        revenue: 51900,
        avatarColor: '#7c3aed',
    },
    {
        id: 'TR-1003',
        name: 'David Okafor',
        email: 'david.okafor@fittrack.io',
        specialization: 'Bodybuilding',
        status: 'active',
        capacity: 30,
        clients: 18,
        joinDate: '2023-06-21',
        rating: 4.7,
        revenue: 39750,
        avatarColor: '#047857',
    },
    {
        id: 'TR-1004',
        name: 'Priya Nair',
        email: 'priya.nair@fittrack.io',
        specialization: 'Yoga & Mobility',
        status: 'active',
        capacity: 18,
        clients: 12,
        joinDate: '2024-01-09',
        rating: 4.9,
        revenue: 27600,
        avatarColor: '#be123c',
    },
    {
        id: 'TR-1005',
        name: 'Liam Fitzgerald',
        email: 'liam.fitzgerald@fittrack.io',
        specialization: 'Endurance & Running',
        status: 'inactive',
        capacity: 22,
        clients: 4,
        joinDate: '2022-08-30',
        rating: 4.5,
        revenue: 15400,
        avatarColor: '#b45309',
    },
    {
        id: 'TR-1006',
        name: 'Hana Kimura',
        email: 'hana.kimura@fittrack.io',
        specialization: 'Functional Training',
        status: 'active',
        capacity: 24,
        clients: 21,
        joinDate: '2023-09-12',
        rating: 4.8,
        revenue: 44100,
        avatarColor: '#0f766e',
    },
]

const goals = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Endurance', 'Toning', 'Rehabilitation']
const plans = ['Starter', 'Standard', 'Premium', 'Elite']
const firstNames = ['Emma', 'Noah', 'Olivia', 'James', 'Ava', 'William', 'Isabella', 'Ethan', 'Mia', 'Lucas', 'Charlotte', 'Henry', 'Amelia', 'Jack', 'Harper', 'Leo', 'Grace', 'Owen', 'Chloe', 'Sam', 'Zoe', 'Ryan', 'Lily', 'Adam', 'Nora', 'Ben', 'Ruby', 'Theo', 'Ella', 'Max']
const lastNames = ['Thompson', 'Carter', 'Reyes', 'Nguyen', 'Patel', 'Rossi', 'Kowalski', 'Andersen', 'Silva', 'Murphy', 'Haddad', 'Larsen', 'Volkov', 'Osei', 'Bianchi', 'Kim', 'Novak', 'Costa', 'Weber', 'Dubois']

function seedRandom(seed) {
    let s = seed
    return () => {
        s = (s * 9301 + 49297) % 233280
        return s / 233280
    }
}

const rand = seedRandom(42)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]

function makeDate(daysAgo) {
    const d = new Date('2026-08-27')
    d.setDate(d.getDate() - daysAgo)
    return d.toISOString().slice(0, 10)
}

// Build 96 realistic clients spread across trainers.
export const clients = Array.from({ length: 96 }).map((_, i) => {
    const first = firstNames[i % firstNames.length]
    const last = lastNames[Math.floor(i / firstNames.length + i) % lastNames.length]
    const name = `${first} ${last}`
    const activeTrainers = trainers.filter((t) => t.status === 'active')
    const trainer = activeTrainers[i % activeTrainers.length]
    const statusRoll = rand()
    const status = statusRoll > 0.16 ? 'active' : statusRoll > 0.06 ? 'inactive' : 'pending'
    return {
        id: `CL-${2001 + i}`,
        name,
        email: `${first}.${last}@gmail.com`.toLowerCase(),
        role: 'Client',
        goal: pick(goals),
        plan: pick(plans),
        status,
        trainerId: trainer.id,
        trainerName: trainer.name,
        progress: Math.round(35 + rand() * 60),
        joinDate: makeDate(Math.floor(rand() * 540)),
        lastActivity: makeDate(Math.floor(rand() * 14)),
        avatarColor: pick(['#0b2545', '#7c3aed', '#047857', '#be123c', '#b45309', '#0f766e', '#2563eb']),
    }
})

// Users list = trainers + clients + a super admin, unified for the Users page.
export const users = [
    {
        id: 'AD-0001',
        name: 'Alexandra Reed',
        email: 'alex.reed@fittrack.io',
        role: 'Super Admin',
        status: 'active',
        trainerName: '—',
        joinDate: '2022-01-05',
        lastActivity: makeDate(0),
        avatarColor: '#0b2545',
    },
    ...trainers.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        role: 'Trainer',
        status: t.status,
        trainerName: '—',
        joinDate: t.joinDate,
        lastActivity: makeDate(Math.floor(rand() * 6)),
        avatarColor: t.avatarColor,
    })),
    ...clients.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: 'Client',
        status: c.status,
        trainerName: c.trainerName,
        joinDate: c.joinDate,
        lastActivity: c.lastActivity,
        avatarColor: c.avatarColor,
    })),
]

const payStatuses = ['paid', 'pending', 'failed', 'refunded']
const payMethods = ['Visa •••• 4242', 'Mastercard •••• 5518', 'PayPal', 'Apple Pay', 'Bank Transfer']
const planPrices = { Starter: 49, Standard: 89, Premium: 149, Elite: 249 }

export const payments = Array.from({ length: 120 }).map((_, i) => {
    const client = clients[i % clients.length]
    const roll = rand()
    const status = roll > 0.32 ? 'paid' : roll > 0.16 ? 'pending' : roll > 0.06 ? 'failed' : 'refunded'
    return {
        id: `PMT-${9000 + i}`,
        clientName: client.name,
        clientAvatar: client.avatarColor,
        trainerName: client.trainerName,
        plan: client.plan,
        amount: planPrices[client.plan],
        date: makeDate(Math.floor(rand() * 180)),
        status,
        method: pick(payMethods),
        txnId: `txn_${Math.floor(rand() * 900000 + 100000)}`,
    }
})

export const libraryResources = [
    { id: 'LB-01', title: 'Full Body Strength Program (12 Weeks)', category: 'Workout Guides', description: 'Progressive overload plan with weekly splits and video demos.', url: 'https://drive.google.com/fittrack/strength-12w', status: 'active', updated: '2026-08-12' },
    { id: 'LB-02', title: 'Fat Loss Nutrition Handbook', category: 'Nutrition Guides', description: 'Calorie targets, macro splits and 40 high-protein recipes.', url: 'https://drive.google.com/fittrack/fatloss-nutrition', status: 'active', updated: '2026-08-04' },
    { id: 'LB-03', title: 'Perfect Squat Form Breakdown', category: 'Exercise Videos', description: 'Frame-by-frame coaching cues for depth and bracing.', url: 'https://youtube.com/watch?v=fittrack-squat', status: 'active', updated: '2026-07-28' },
    { id: 'LB-04', title: 'Client Onboarding Checklist', category: 'Documents', description: 'Intake form, PAR-Q and consent templates.', url: 'https://drive.google.com/fittrack/onboarding', status: 'active', updated: '2026-08-18' },
    { id: 'LB-05', title: 'Understanding Macronutrients', category: 'Educational Resources', description: 'Explainer on protein, carbs and fats for beginners.', url: 'https://drive.google.com/fittrack/macros-101', status: 'inactive', updated: '2026-06-30' },
    { id: 'LB-06', title: 'Mobility & Recovery Routines', category: 'Workout Guides', description: 'Daily 15-minute mobility flows for desk workers.', url: 'https://drive.google.com/fittrack/mobility', status: 'active', updated: '2026-08-20' },
    { id: 'LB-07', title: 'Meal Prep Masterclass', category: 'Nutrition Guides', description: 'Batch cooking systems for a full week in 90 minutes.', url: 'https://youtube.com/watch?v=fittrack-mealprep', status: 'active', updated: '2026-08-09' },
    { id: 'LB-08', title: 'Deadlift Setup & Safety', category: 'Exercise Videos', description: 'Hip hinge mechanics and common mistakes to avoid.', url: 'https://youtube.com/watch?v=fittrack-deadlift', status: 'active', updated: '2026-07-15' },
]

export const libraryCategories = [
    'Workout Guides',
    'Nutrition Guides',
    'Exercise Videos',
    'Documents',
    'Educational Resources',
]

// ---- Dashboard time-series ----
export const clientGrowth = [
    { month: 'Jan', clients: 41, trainers: 3 },
    { month: 'Feb', clients: 48, trainers: 3 },
    { month: 'Mar', clients: 55, trainers: 4 },
    { month: 'Apr', clients: 63, trainers: 4 },
    { month: 'May', clients: 70, trainers: 5 },
    { month: 'Jun', clients: 78, trainers: 5 },
    { month: 'Jul', clients: 88, trainers: 6 },
    { month: 'Aug', clients: 96, trainers: 6 },
]

export const revenueTrend = [
    { month: 'Jan', revenue: 18400 },
    { month: 'Feb', revenue: 21200 },
    { month: 'Mar', revenue: 24800 },
    { month: 'Apr', revenue: 27600 },
    { month: 'May', revenue: 31100 },
    { month: 'Jun', revenue: 34900 },
    { month: 'Jul', revenue: 38700 },
    { month: 'Aug', revenue: 42300 },
]

// Weekly progress series for a client's detail page (weight + activity).
export const clientProgressSeries = [
    { week: 'W1', weight: 84, activity: 62 },
    { week: 'W2', weight: 83.2, activity: 70 },
    { week: 'W3', weight: 82.5, activity: 68 },
    { week: 'W4', weight: 81.6, activity: 78 },
    { week: 'W5', weight: 80.9, activity: 82 },
    { week: 'W6', weight: 80.1, activity: 75 },
    { week: 'W7', weight: 79.4, activity: 88 },
    { week: 'W8', weight: 78.6, activity: 91 },
]

// Recent activity timeline entries for a client's detail page.
export const clientActivity = [
    { id: 'A1', title: 'Completed morning workout', time: 'Today, 07:40', type: 'workout' },
    { id: 'A2', title: 'Logged breakfast — on plan', time: 'Today, 08:30', type: 'diet' },
    { id: 'A3', title: 'Hit water goal (2L)', time: 'Yesterday, 21:10', type: 'water' },
    { id: 'A4', title: 'Weekly check-in submitted', time: '2 days ago', type: 'checkin' },
    { id: 'A5', title: 'New diet plan assigned', time: '4 days ago', type: 'plan' },
]

export const notifications = [
    { id: 'N1', type: 'payment', title: 'Payment received', desc: 'Emma Thompson paid $149 (Premium).', time: '12m ago', unread: true },
    { id: 'N2', type: 'user', title: 'New trainer application', desc: 'Hana Kimura submitted onboarding docs.', time: '1h ago', unread: true },
    { id: 'N3', type: 'capacity', title: 'Trainer at capacity', desc: 'Sofia Alvarez reached 20/20 clients.', time: '3h ago', unread: true },
    { id: 'N4', type: 'library', title: 'Resource updated', desc: 'Mobility & Recovery Routines was published.', time: '6h ago', unread: false },
    { id: 'N5', type: 'payment', title: 'Payment failed', desc: 'A Standard plan charge was declined.', time: '1d ago', unread: false },
    { id: 'N6', type: 'user', title: 'Client deactivated', desc: 'Account for Leo Weber set to inactive.', time: '2d ago', unread: false },
]

// ---- Derived aggregate stats used across the dashboard/payments ----
export function getStats() {
    const totalClients = clients.length
    const activeClients = clients.filter((c) => c.status === 'active').length
    const totalTrainers = trainers.length
    const activeTrainers = trainers.filter((t) => t.status === 'active').length
    const totalCapacity = trainers.reduce((s, t) => s + t.capacity, 0)
    const usedCapacity = trainers.reduce((s, t) => s + t.clients, 0)

    const paid = payments.filter((p) => p.status === 'paid')
    const pending = payments.filter((p) => p.status === 'pending')
    const failed = payments.filter((p) => p.status === 'failed')
    const refunded = payments.filter((p) => p.status === 'refunded')

    const totalRevenue = paid.reduce((s, p) => s + p.amount, 0)
    const pendingAmount = pending.reduce((s, p) => s + p.amount, 0)

    return {
        totalClients,
        activeClients,
        totalTrainers,
        activeTrainers,
        availableCapacity: totalCapacity - usedCapacity,
        totalCapacity,
        usedCapacity,
        totalRevenue,
        pendingAmount,
        paidCount: paid.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        refundedCount: refunded.length,
        paymentStatusData: [
            { name: 'Paid', value: paid.length, key: 'paid' },
            { name: 'Pending', value: pending.length, key: 'pending' },
            { name: 'Failed', value: failed.length, key: 'failed' },
            { name: 'Refunded', value: refunded.length, key: 'refunded' },
        ],
        clientDistribution: trainers
            .filter((t) => t.clients > 0)
            .map((t) => ({ name: t.name.split(' ')[0], value: t.clients })),
    }
}
