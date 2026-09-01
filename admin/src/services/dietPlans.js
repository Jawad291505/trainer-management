// Shared diet-plan templates — single source of truth at /data/dietPlans.json,
// consumed by the admin (who manages them) and the trainer (who applies one to a
// client's plan). When a backend arrives, swap the JSON import for an API.

import dietPlanData from '@data/dietPlans.json'

export const dietPlanSeed = dietPlanData.plans
export const MAX_DIET_PLANS = dietPlanData.maxPlans || 4

export const dietGoals = [
    'Fat Loss',
    'Muscle Gain',
    'Body Recomposition',
    'General Fitness',
    'Endurance',
]
