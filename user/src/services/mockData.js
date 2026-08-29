// Centralized, realistic mock data for the Client portal.
// The logged-in client is "Emma Thompson".

// Consultation goal categories. "Other" lets a client type a custom goal.
export const clientGoals = [
    'Fat Loss',
    'Muscle Gain',
    'Body Recomposition',
    'PCOS',
    'Busy Moms',
    'Diabetic Patients',
]

export const currentClient = {
    id: 'CL-2001',
    name: 'Emma Thompson',
    email: 'emma.thompson@gmail.com',
    goal: 'Fat Loss',
    plan: 'Elite',
    weight: 68,
    target: 62,
    startWeight: 74,
    progress: 82,
    avatarColor: '#0b2545',
}

export const trainer = {
    id: 'TR-1001',
    name: 'Marcus Bennett',
    specialization: 'Strength & Conditioning',
    avatarColor: '#0b2545',
    nextFollowUp: '2026-08-29',
    online: true,
}

// ---- Today's tasks / checklist ----
export const todayTasks = [
    { id: 'T1', label: 'Breakfast — Oats & egg whites', type: 'meal', time: '08:00', done: true },
    { id: 'T2', label: 'Drink 2L water', type: 'water', time: 'All day', done: true },
    { id: 'T3', label: 'Morning workout — Chest & Triceps', type: 'workout', time: '09:30', done: true },
    { id: 'T4', label: 'Lunch — Chicken & brown rice', type: 'meal', time: '13:00', done: true },
    { id: 'T5', label: 'Evening walk (30 min)', type: 'walk', time: '18:00', done: false },
    { id: 'T6', label: 'Dinner — Salmon & sweet potato', type: 'meal', time: '19:30', done: false },
    { id: 'T7', label: '8 hours sleep', type: 'sleep', time: '23:00', done: false },
]

// ---- Diet plan ----
export const dietPlan = {
    title: 'Fat Loss — Week 6',
    meals: [
        {
            id: 'M1', name: 'Breakfast', time: '08:00', taskId: 'T1',
            items: [
                { food: 'Egg whites', qty: '4' },
                { food: 'Oats', qty: '50g' },
                { food: 'Blueberries', qty: '80g' },
            ],
            notes: 'Have within 30 min of waking.',
        },
        {
            id: 'M2', name: 'Snack', time: '11:00', taskId: null,
            items: [
                { food: 'Greek yogurt', qty: '150g' },
                { food: 'Almonds', qty: '15g' },
            ],
            notes: '',
        },
        {
            id: 'M3', name: 'Lunch', time: '13:00', taskId: 'T4',
            items: [
                { food: 'Grilled chicken', qty: '150g' },
                { food: 'Brown rice', qty: '120g' },
                { food: 'Mixed greens', qty: '1 bowl' },
            ],
            notes: '',
        },
        {
            id: 'M4', name: 'Snack', time: '16:00', taskId: null,
            items: [{ food: 'Apple', qty: '1' }, { food: 'Peanut butter', qty: '1 tbsp' }],
            notes: '',
        },
        {
            id: 'M5', name: 'Dinner', time: '19:30', taskId: 'T6',
            items: [
                { food: 'Salmon', qty: '140g' },
                { food: 'Sweet potato', qty: '150g' },
            ],
            notes: 'Add greens if still hungry.',
        },
    ],
}

// ---- Exercise plan ----
export const exercisePlan = {
    title: 'Push / Pull / Legs',
    today: 'Chest & Triceps',
    exercises: [
        { id: 'E1', name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s', youtube: 'https://youtube.com/watch?v=rT7DgCr-3pg', instructions: 'Control the eccentric, drive through the chest.', done: true },
        { id: 'E2', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '75s', youtube: 'https://youtube.com/watch?v=8iPEnn-ltC8', instructions: 'Keep a slight arch, full range.', done: true },
        { id: 'E3', name: 'Cable Fly', sets: 3, reps: '12-15', rest: '60s', youtube: '', instructions: 'Squeeze at the top for a second.', done: false },
        { id: 'E4', name: 'Rope Pushdown', sets: 3, reps: '12', rest: '60s', youtube: '', instructions: 'Elbows tucked, full extension.', done: false },
        { id: 'E5', name: 'Overhead Extension', sets: 3, reps: '12', rest: '60s', youtube: '', instructions: 'Keep upper arms still.', done: false },
    ],
}

// ---- Schedule ----
export const schedule = {
    today: [
        { id: 'A1', time: '08:00', title: 'Breakfast', type: 'meal', done: true },
        { id: 'A2', time: '09:30', title: 'Chest & Triceps workout', type: 'workout', done: true },
        { id: 'A3', time: '13:00', title: 'Lunch', type: 'meal', done: true },
        { id: 'A4', time: '18:00', title: 'Evening walk', type: 'walk', done: false },
        { id: 'A5', time: '19:30', title: 'Dinner', type: 'meal', done: false },
    ],
    upcoming: [
        { id: 'U1', date: 'Fri, 29 Aug', title: 'Follow-up with Marcus', type: 'followup' },
        { id: 'U2', date: 'Sat, 30 Aug', title: 'Legs workout', type: 'workout' },
        { id: 'U3', date: 'Mon, 01 Sep', title: 'Weekly weigh-in', type: 'checkin' },
    ],
}

export const activityColors = {
    meal: 'var(--color-success)',
    workout: 'var(--color-primary)',
    walk: 'var(--color-info)',
    followup: 'var(--color-warning)',
    checkin: 'var(--color-warning)',
    sleep: '#7c3aed',
    water: 'var(--color-info)',
}

// ---- Progress ----
export const weightProgress = [
    { week: 'W1', weight: 74 },
    { week: 'W2', weight: 73.1 },
    { week: 'W3', weight: 72.4 },
    { week: 'W4', weight: 71.5 },
    { week: 'W5', weight: 70.6 },
    { week: 'W6', weight: 69.8 },
    { week: 'W7', weight: 68.7 },
    { week: 'W8', weight: 68 },
]

export const weeklyCompletion = [
    { day: 'Mon', pct: 100 },
    { day: 'Tue', pct: 86 },
    { day: 'Wed', pct: 71 },
    { day: 'Thu', pct: 100 },
    { day: 'Fri', pct: 57 },
    { day: 'Sat', pct: 86 },
    { day: 'Sun', pct: 71 },
]

export const complianceData = [
    { name: 'Diet', value: 88 },
    { name: 'Workout', value: 76 },
    { name: 'Water', value: 94 },
    { name: 'Sleep', value: 68 },
]

// ---- Chat ----
export const messages = [
    { id: 'm1', from: 'trainer', text: 'Morning Emma! Ready for chest and triceps today?', time: '08:02' },
    { id: 'm2', from: 'client', text: 'Yes! Feeling good today 💪', time: '08:05' },
    { id: 'm3', from: 'trainer', text: 'Great. Add 2.5kg to bench if the last set felt strong.', time: '08:07' },
    { id: 'm4', from: 'client', text: 'Will do. Thanks coach!', time: '08:09' },
    { id: 'm5', from: 'trainer', text: 'Smash it 🔥 Send me how it goes.', time: '08:10' },
]

// ---- Correction requests (client → trainer) ----
export const correctionAreaLabels = {
    diet: 'Diet plan',
    exercise: 'Exercise plan',
    progress: 'Progress / weigh-in',
    general: 'General',
}
export const correctionTypeLabels = {
    swap: 'Swap / substitute',
    'too-hard': 'Too difficult',
    injury: 'Injury / pain',
    'wrong-data': 'Wrong data',
    other: 'Other',
}
export const correctionTypeOptions = Object.entries(correctionTypeLabels).map(([value, label]) => ({ value, label }))

export const correctionSeed = [
    {
        id: 'RQ-2001',
        area: 'exercise',
        item: 'Rope Pushdown',
        type: 'injury',
        note: 'Elbow tendon is sore on pushdowns. Can we swap for a different triceps move this week?',
        status: 'open',
        reply: '',
        createdAt: '2026-08-28',
        resolvedAt: null,
    },
    {
        id: 'RQ-2002',
        area: 'diet',
        item: 'Snack — Greek yogurt & almonds',
        type: 'swap',
        note: "I'm out of Greek yogurt and can't restock till the weekend. Any substitute?",
        status: 'resolved',
        reply: 'Swap for 150g cottage cheese or a scoop of whey in water. Same protein, no need to log it as a cheat.',
        createdAt: '2026-08-24',
        resolvedAt: '2026-08-25',
    },
]

// ---- Notifications ----
export const notifications = [
    { id: 'N1', type: 'plan', title: 'New exercise plan', desc: 'Marcus updated your Push/Pull/Legs plan.', time: '20m ago', unread: true },
    { id: 'N2', type: 'message', title: 'New message', desc: 'Marcus: "Smash it 🔥"', time: '1h ago', unread: true },
    { id: 'N3', type: 'followup', title: 'Follow-up reminder', desc: 'Check-in with Marcus on Fri, 29 Aug.', time: '4h ago', unread: true },
    { id: 'N4', type: 'diet', title: 'Diet plan updated', desc: 'Your Week 6 meals are ready.', time: '1d ago', unread: false },
    { id: 'N5', type: 'progress', title: 'Milestone reached', desc: 'You hit 82% of your goal weight!', time: '2d ago', unread: false },
]

// ---- Derived ----
export function getTodayProgress(tasks) {
    const done = tasks.filter((t) => t.done).length
    return { done, total: tasks.length, pct: Math.round((done / tasks.length) * 100) }
}
