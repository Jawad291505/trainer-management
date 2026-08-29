// Centralized, realistic mock data for the Trainer portal.
// The logged-in trainer is "Marcus Bennett".

export const currentTrainer = {
    id: 'TR-1001',
    name: 'Marcus Bennett',
    email: 'marcus.bennett@fittrack.io',
    specialization: 'Strength & Conditioning',
    rating: 4.9,
    avatarColor: '#0b2545',
}

const goals = ['Weight Loss', 'Muscle Gain', 'General Fitness', 'Endurance', 'Toning']
const plans = ['Starter', 'Standard', 'Premium', 'Elite']
const avatarColors = ['#0b2545', '#7c3aed', '#047857', '#be123c', '#b45309', '#0f766e', '#2563eb']

function makeDate(daysFromToday) {
    const d = new Date('2026-08-27')
    d.setDate(d.getDate() + daysFromToday)
    return d.toISOString().slice(0, 10)
}

const clientSeed = [
    { name: 'Emma Thompson', goal: 'Weight Loss', plan: 'Elite', progress: 82, weight: 68, target: 62, followUp: 0, attention: false },
    { name: 'Noah Carter', goal: 'Muscle Gain', plan: 'Premium', progress: 74, weight: 78, target: 85, followUp: -2, attention: true },
    { name: 'Olivia Reyes', goal: 'Toning', plan: 'Standard', progress: 64, weight: 61, target: 58, followUp: 1, attention: false },
    { name: 'James Nguyen', goal: 'Endurance', plan: 'Premium', progress: 90, weight: 74, target: 72, followUp: 3, attention: false },
    { name: 'Ava Patel', goal: 'Weight Loss', plan: 'Standard', progress: 48, weight: 82, target: 70, followUp: -5, attention: true },
    { name: 'William Rossi', goal: 'Muscle Gain', plan: 'Elite', progress: 71, weight: 88, target: 95, followUp: 0, attention: false },
    { name: 'Isabella Kowalski', goal: 'General Fitness', plan: 'Starter', progress: 55, weight: 65, target: 63, followUp: 2, attention: false },
    { name: 'Ethan Andersen', goal: 'Weight Loss', plan: 'Premium', progress: 38, weight: 95, target: 82, followUp: -1, attention: true },
    { name: 'Mia Silva', goal: 'Toning', plan: 'Standard', progress: 79, weight: 58, target: 55, followUp: 5, attention: false },
    { name: 'Lucas Murphy', goal: 'Muscle Gain', plan: 'Elite', progress: 86, weight: 80, target: 88, followUp: 7, attention: false },
    { name: 'Charlotte Haddad', goal: 'Endurance', plan: 'Premium', progress: 67, weight: 63, target: 60, followUp: 1, attention: false },
    { name: 'Henry Larsen', goal: 'General Fitness', plan: 'Starter', progress: 42, weight: 90, target: 84, followUp: -3, attention: true },
]

export const clients = clientSeed.map((c, i) => {
    const [first, last] = c.name.split(' ')
    return {
        id: `CL-${2001 + i}`,
        ...c,
        email: `${first}.${last}@gmail.com`.toLowerCase(),
        status: c.progress < 45 ? 'inactive' : 'active',
        avatarColor: avatarColors[i % avatarColors.length],
        lastFollowUp: makeDate(-7 + (i % 4)),
        nextFollowUp: makeDate(c.followUp),
        joinDate: makeDate(-120 - i * 9),
        phone: `+1 (555) 0${100 + i}-22${10 + i}`,
    }
})

export function getClient(id) {
    return clients.find((c) => c.id === id)
}

// ---- Today's schedule ----
const activityTypes = {
    workout: { label: 'Workout', color: 'var(--color-primary)' },
    consultation: { label: 'Consultation', color: 'var(--color-info)' },
    followup: { label: 'Follow-up', color: 'var(--color-warning)' },
    meal: { label: 'Meal Review', color: 'var(--color-success)' },
    break: { label: 'Break', color: 'var(--color-text-muted)' },
}
export { activityTypes }

export const todaySchedule = [
    { id: 'S1', time: '08:00', clientId: 'CL-2001', title: 'Strength session', type: 'workout', status: 'completed' },
    { id: 'S2', time: '09:30', clientId: 'CL-2003', title: 'Progress check-in', type: 'consultation', status: 'completed' },
    { id: 'S3', time: '11:00', clientId: 'CL-2002', title: 'Hypertrophy training', type: 'workout', status: 'in-progress' },
    { id: 'S4', time: '12:30', clientId: null, title: 'Lunch break', type: 'break', status: 'upcoming' },
    { id: 'S5', time: '14:00', clientId: 'CL-2005', title: 'Diet plan review', type: 'meal', status: 'upcoming' },
    { id: 'S6', time: '15:30', clientId: 'CL-2004', title: 'Endurance coaching', type: 'workout', status: 'upcoming' },
    { id: 'S7', time: '17:00', clientId: 'CL-2008', title: 'Follow-up call', type: 'followup', status: 'upcoming' },
]

// ---- Follow-ups ----
export const followUps = clients.map((c, i) => {
    const day = c.nextFollowUp
    let bucket = 'upcoming'
    if (c.followUp < 0) bucket = 'overdue'
    else if (c.followUp === 0) bucket = 'today'
    if (i % 5 === 0 && c.followUp > 3) bucket = 'completed'
    return {
        id: `FU-${300 + i}`,
        clientId: c.id,
        clientName: c.name,
        avatarColor: c.avatarColor,
        goal: c.goal,
        date: day,
        bucket,
        note: bucket === 'overdue' ? 'Missed last two check-ins' : 'Weekly progress review',
    }
})

// ---- Diet plan (builder data for a sample client) ----
export const sampleDietPlan = {
    clientId: 'CL-2001',
    title: 'Fat Loss — Week 6',
    meals: [
        {
            id: 'M1', name: 'Breakfast', time: '08:00',
            items: [
                { food: 'Egg whites', qty: '4', cal: 68, protein: 14, carbs: 0, fat: 0 },
                { food: 'Oats', qty: '50g', cal: 190, protein: 6, carbs: 33, fat: 3 },
                { food: 'Blueberries', qty: '80g', cal: 45, protein: 1, carbs: 11, fat: 0 },
            ],
            notes: 'Have within 30 min of waking.',
        },
        {
            id: 'M2', name: 'Lunch', time: '13:00',
            items: [
                { food: 'Grilled chicken', qty: '150g', cal: 248, protein: 46, carbs: 0, fat: 6 },
                { food: 'Brown rice', qty: '120g', cal: 155, protein: 3, carbs: 33, fat: 1 },
                { food: 'Mixed greens', qty: '1 bowl', cal: 40, protein: 2, carbs: 6, fat: 1 },
            ],
            notes: '',
        },
        {
            id: 'M3', name: 'Dinner', time: '19:30',
            items: [
                { food: 'Salmon', qty: '140g', cal: 280, protein: 39, carbs: 0, fat: 13 },
                { food: 'Sweet potato', qty: '150g', cal: 129, protein: 2, carbs: 30, fat: 0 },
            ],
            notes: 'Add greens if still hungry.',
        },
    ],
}

// ---- Exercise plan (by day) ----
export const sampleExercisePlan = {
    clientId: 'CL-2001',
    title: 'Push / Pull / Legs',
    days: [
        {
            id: 'D1', day: 'Monday', focus: 'Chest & Triceps',
            exercises: [
                { name: 'Bench Press', sets: 4, reps: '8-10', rest: '90s', youtube: 'https://youtube.com/watch?v=rT7DgCr-3pg', notes: 'Control the eccentric.' },
                { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '75s', youtube: 'https://youtube.com/watch?v=8iPEnn-ltC8', notes: '' },
                { name: 'Cable Fly', sets: 3, reps: '12-15', rest: '60s', youtube: '', notes: 'Squeeze at the top.' },
                { name: 'Rope Pushdown', sets: 3, reps: '12', rest: '60s', youtube: '', notes: '' },
            ],
        },
        {
            id: 'D2', day: 'Wednesday', focus: 'Back & Biceps',
            exercises: [
                { name: 'Deadlift', sets: 4, reps: '5', rest: '120s', youtube: 'https://youtube.com/watch?v=op9kVnSso6Q', notes: 'Brace hard.' },
                { name: 'Pull-ups', sets: 3, reps: 'AMRAP', rest: '90s', youtube: '', notes: '' },
                { name: 'Barbell Row', sets: 3, reps: '10', rest: '75s', youtube: '', notes: '' },
            ],
        },
        {
            id: 'D3', day: 'Friday', focus: 'Legs',
            exercises: [
                { name: 'Back Squat', sets: 4, reps: '8', rest: '120s', youtube: 'https://youtube.com/watch?v=ultWZbUMPL8', notes: 'Depth below parallel.' },
                { name: 'Romanian Deadlift', sets: 3, reps: '10', rest: '90s', youtube: '', notes: '' },
                { name: 'Leg Press', sets: 3, reps: '12', rest: '75s', youtube: '', notes: '' },
            ],
        },
    ],
}

// ---- Client daily checklist / progress tracking ----
export const clientChecklist = [
    { id: 'T1', label: 'Followed breakfast plan', done: true },
    { id: 'T2', label: 'Drank 2L water', done: true },
    { id: 'T3', label: 'Completed workout', done: true },
    { id: 'T4', label: 'Followed lunch plan', done: true },
    { id: 'T5', label: 'Evening walk (30 min)', done: false },
    { id: 'T6', label: 'Followed dinner plan', done: false },
    { id: 'T7', label: '8 hours sleep', done: true },
]

export const weeklyCompletion = [
    { day: 'Mon', pct: 100 },
    { day: 'Tue', pct: 86 },
    { day: 'Wed', pct: 71 },
    { day: 'Thu', pct: 100 },
    { day: 'Fri', pct: 57 },
    { day: 'Sat', pct: 71 },
    { day: 'Sun', pct: 71 },
]

export const weightProgress = [
    { week: 'W1', weight: 72 },
    { week: 'W2', weight: 71.2 },
    { week: 'W3', weight: 70.6 },
    { week: 'W4', weight: 70.1 },
    { week: 'W5', weight: 69.3 },
    { week: 'W6', weight: 68.6 },
    { week: 'W7', weight: 68.1 },
    { week: 'W8', weight: 67.4 },
]

// ---- Chat ----
export const conversations = clients.slice(0, 8).map((c, i) => ({
    id: `CV-${c.id}`,
    clientId: c.id,
    name: c.name,
    avatarColor: c.avatarColor,
    online: i % 3 === 0,
    unread: i === 1 ? 3 : i === 4 ? 1 : 0,
    lastMessage: [
        'Thanks coach! Felt great today 💪',
        'Should I increase the weight next week?',
        'Done with all meals today ✅',
        'My knee felt a bit sore during squats',
        'See you tomorrow at 8!',
        'Can we reschedule Friday?',
        'Hit a new PR on bench 🎉',
        'Water goal complete for the week',
    ][i],
    lastTime: ['09:12', '08:40', 'Yesterday', 'Yesterday', 'Mon', 'Mon', 'Sun', 'Sun'][i],
}))

export const messagesByClient = {
    'CL-2001': [
        { id: 'm1', from: 'client', text: 'Morning coach! Ready for today?', time: '08:02' },
        { id: 'm2', from: 'trainer', text: 'Absolutely. We\'re hitting chest and triceps today. Warm up well.', time: '08:05' },
        { id: 'm3', from: 'client', text: 'On it. Should I go heavier on bench?', time: '08:09' },
        { id: 'm4', from: 'trainer', text: 'Add 2.5kg per side if last set felt strong. Keep the tempo controlled.', time: '08:11' },
        { id: 'm5', from: 'client', text: 'Thanks coach! Felt great today 💪', time: '09:12' },
    ],
    'CL-2002': [
        { id: 'm1', from: 'client', text: 'Should I increase the weight next week?', time: '08:40' },
    ],
}

// ---- Chart datasets (derived) ----

// Clients grouped by training goal — donut.
export const clientGoalData = goals
    .map((g) => ({ name: g, value: clients.filter((c) => c.goal === g).length }))
    .filter((d) => d.value > 0)

// Clients grouped by membership plan — donut.
export const clientPlanData = plans
    .map((p) => ({ name: p, value: clients.filter((c) => c.plan === p).length }))
    .filter((d) => d.value > 0)

// Follow-up pipeline by state — donut.
export const followUpStatusData = [
    { key: 'overdue', name: 'Overdue', value: followUps.filter((f) => f.bucket === 'overdue').length },
    { key: 'today', name: 'Today', value: followUps.filter((f) => f.bucket === 'today').length },
    { key: 'upcoming', name: 'Upcoming', value: followUps.filter((f) => f.bucket === 'upcoming').length },
    { key: 'completed', name: 'Completed', value: followUps.filter((f) => f.bucket === 'completed').length },
].filter((d) => d.value > 0)

// Sessions delivered per weekday — bar.
export const weeklySessions = [
    { day: 'Mon', sessions: 6 },
    { day: 'Tue', sessions: 5 },
    { day: 'Wed', sessions: 7 },
    { day: 'Thu', sessions: 4 },
    { day: 'Fri', sessions: 6 },
    { day: 'Sat', sessions: 3 },
    { day: 'Sun', sessions: 1 },
]

// Average client goal-completion by month — area.
export const clientProgressTrend = [
    { month: 'Mar', progress: 41 },
    { month: 'Apr', progress: 47 },
    { month: 'May', progress: 54 },
    { month: 'Jun', progress: 59 },
    { month: 'Jul', progress: 63 },
    { month: 'Aug', progress: 66 },
]

// ---- Dashboard stats ----
export function getStats() {
    const total = clients.length
    const active = clients.filter((c) => c.status === 'active').length
    const attention = clients.filter((c) => c.attention).length
    const todaySessions = todaySchedule.filter((s) => s.type !== 'break').length
    const pendingFollowUps = followUps.filter((f) => f.bucket === 'overdue' || f.bucket === 'today').length
    const completedFollowUps = followUps.filter((f) => f.bucket === 'completed').length
    return { total, active, attention, todaySessions, pendingFollowUps, completedFollowUps }
}

// ---- Notifications ----
export const notifications = [
    { id: 'N1', type: 'message', title: 'New message', desc: 'Noah Carter sent you 3 messages.', time: '10m ago', unread: true },
    { id: 'N2', type: 'followup', title: 'Follow-up overdue', desc: 'Ava Patel is 5 days overdue.', time: '1h ago', unread: true },
    { id: 'N3', type: 'progress', title: 'Goal reached', desc: 'James Nguyen hit 90% completion.', time: '3h ago', unread: true },
    { id: 'N4', type: 'session', title: 'Session reminder', desc: 'Diet plan review with Ava at 14:00.', time: '5h ago', unread: false },
    { id: 'N5', type: 'message', title: 'New message', desc: 'Emma Thompson: "Felt great today 💪"', time: '1d ago', unread: false },
]
