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

// User roles across the three portals. 'member' is an Admin-portal sub-role:
// same UI as admin, scoped to the members's own Trainers/Clients, no Payments.
export const ROLES = { ADMIN: 'admin', MEMBER: 'member', TRAINER: 'trainer', CLIENT: 'client' }
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
// Bucket is the display grouping derived from date + status (see
// services/followUp.service.js); 'missed' is a trainer-marked no-show.
export const FOLLOWUP_BUCKETS = ['overdue', 'today', 'upcoming', 'completed', 'missed']

// FollowUp.status — lifecycle: scheduled -> completed | missed.
export const FOLLOWUP_STATUS = ['scheduled', 'completed', 'missed']

// FollowUp.type — how the check-in happens.
export const FOLLOWUP_TYPES = ['check-in', 'call', 'in-person', 'plan-review']

// {trainer,user}/src/services/mockData.js -> correctionAreaLabels / correctionTypeLabels
export const CORRECTION_AREAS = ['diet', 'exercise', 'progress', 'general']
export const CORRECTION_TYPES = ['swap', 'too-hard', 'injury', 'wrong-data', 'other']
export const CORRECTION_STATUS = ['open', 'resolved', 'declined']
// What a request points at (so the trainer can jump straight to it), how urgent
// it is, and how long an open one may sit before it is flagged as overdue.
export const CORRECTION_TARGET_KINDS = ['meal', 'exercise', 'weigh-in']
export const CORRECTION_PRIORITY = ['normal', 'high']
export const CORRECTION_STALE_HOURS = 48

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

// Member-to-member referral reimbursement (admin pays the referrer back).
export const REIMBURSEMENT_STATUS = ['pending', 'reimbursed', 'rejected']

// Member self-signup flow (controllers/memberSignup.controller.js). Member.status
// stays 'pending' the whole way through until 'approved' is granted -> 'active';
// 'rejected' is a terminal sub-state of 'pending' that still allows a resubmit.
export const MEMBER_ONBOARDING_STAGES = [
    'verify_email',
    'select_plan',
    'submit_payment',
    'awaiting_approval',
    'rejected',
    'approved',
]

// Who a Trainer belongs to. 'admin' = Admin's own in-house trainers (legacy
// default), 'member' = in-house for a Member (Trainer.managedBy set),
// 'outsourced' = independent trainer with their own plan + own clients.
export const TRAINER_AFFILIATIONS = ['admin', 'member', 'outsourced']

// Who a SubscriptionPlan is sold to. Members see 'member' plans during signup,
// self-signup Trainers see 'trainer' plans.
export const PLAN_AUDIENCES = ['member', 'trainer']

// controllers/memberPayments.controller.js — a Member's submitted proof-of-payment.
export const MEMBER_PAYMENT_STATUS = ['pending', 'approved', 'rejected']

export const DIET_PLAN_STATUS = ['draft', 'published']
export const EXERCISE_PLAN_STATUS = ['draft', 'published']

// Exercise.trackingType / ExercisePlan planExercise.trackingType — whether a
// set is logged by reps or by a held/timed duration (planks, cardio, etc.).
export const TRACKING_TYPES = ['reps', 'duration']

// WorkoutSession.status — a client's in-progress or finished run through a
// training day (Workout -> Exercise -> Sets -> Completion/Performance).
export const WORKOUT_SESSION_STATUS = ['in_progress', 'completed']

// Review — a client's 1-5 star rating (+ optional comment) of their assigned trainer.
export const REVIEW_MAX_RATING = 5
export const REVIEW_MAX_COMMENT = 1000
