// Domain enums lifted verbatim from the existing front-end repositories so the
// backend speaks the same language. Sources are noted per block.

// admin/trainer/user  src/services/mockData.js  -> clientGoals
export const CLIENT_GOALS = [
    'Fat Loss',
    'Muscle Gain',
    'Body Recomposition',
    'PCOS',
    'Busy Moms',
    'Diabetic Patients',
]

// admin/src/services/mockData.js -> plans + planPrices (USD / month)
export const MEMBERSHIP_PLANS = ['Starter', 'Standard', 'Premium', 'Elite']
export const PLAN_PRICES = { Starter: 49, Standard: 89, Premium: 149, Elite: 249 }

// User roles across the three portals.
export const ROLES = { ADMIN: 'admin', TRAINER: 'trainer', CLIENT: 'client' }
export const ROLE_VALUES = Object.values(ROLES)

// Shared account status (admin Users / Trainers / Clients pages).
export const ACCOUNT_STATUS = ['active', 'inactive', 'pending']

// admin/src/services/mockData.js -> payments
export const PAYMENT_STATUS = ['paid', 'pending', 'failed', 'refunded']
export const PAYMENT_METHODS = [
    'Visa •••• 4242',
    'Mastercard •••• 5518',
    'PayPal',
    'Apple Pay',
    'Bank Transfer',
]

// admin/src/services/mockData.js -> libraryCategories
export const LIBRARY_RESOURCE_CATEGORIES = [
    'Workout Guides',
    'Nutrition Guides',
    'Exercise Videos',
    'Documents',
    'Educational Resources',
]

// trainer/src/services/mockData.js -> followUps buckets
export const FOLLOWUP_BUCKETS = ['overdue', 'today', 'upcoming', 'completed']

// {trainer,user}/src/services/mockData.js -> correctionAreaLabels / correctionTypeLabels
export const CORRECTION_AREAS = ['diet', 'exercise', 'progress', 'general']
export const CORRECTION_TYPES = ['swap', 'too-hard', 'injury', 'wrong-data', 'other']
export const CORRECTION_STATUS = ['open', 'resolved', 'declined']

// {trainer,user}/src/services/mockData.js -> progressPhotoAngleLabels
export const PROGRESS_PHOTO_ANGLES = ['front', 'side', 'back', 'other']

// trainer/src/context/ScheduleContext.jsx -> WEEK_DAYS  (+ 'today' / 'upcoming' buckets)
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const SCHEDULE_SCOPES = ['today', 'upcoming', ...WEEK_DAYS]

// trainer/src/services/mockData.js -> activityTypes  (+ client walk/sleep/checkin types)
export const ACTIVITY_TYPES = [
    'workout',
    'consultation',
    'followup',
    'meal',
    'break',
    'walk',
    'sleep',
    'water',
    'checkin',
]
export const SCHEDULE_STATUS = ['completed', 'in-progress', 'upcoming', 'cancelled']

// data/foodLibrary.json -> item.unit
export const FOOD_UNITS = ['g', 'ml', 'count']

// data/exerciseTechniques.json -> item.key
export const EXERCISE_TECHNIQUES = ['standard', 'tut', 'superset']

// Where a library row originated. 'pdf'/'admin' => master data; 'trainer' => custom.
export const LIBRARY_SOURCES = ['pdf', 'admin', 'trainer']

// data/dietPlans.json -> maxPlans
export const MAX_DIET_PLAN_TEMPLATES = 4

// data/referrals.json -> referral.status
export const REFERRAL_STATUS = ['joined', 'pending']

export const DIET_PLAN_STATUS = ['draft', 'published']
export const EXERCISE_PLAN_STATUS = ['draft', 'published']

// Exercise.trackingType / ExercisePlan planExercise.trackingType — whether a
// set is logged by reps or by a held/timed duration (planks, cardio, etc.).
export const TRACKING_TYPES = ['reps', 'duration']

// WorkoutSession.status — a client's in-progress or finished run through a
// training day (Workout -> Exercise -> Sets -> Completion/Performance).
export const WORKOUT_SESSION_STATUS = ['in_progress', 'completed']
