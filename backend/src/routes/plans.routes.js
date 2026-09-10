import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
} from '../controllers/dietPlanTemplates.controller.js'
import {
    listDietPlans, getDietPlan, getClientDietPlan, createDietPlan, createFromTemplate,
    updateDietPlan, publishDietPlan, deleteDietPlan,
} from '../controllers/dietPlans.controller.js'
import {
    listExercisePlans, getExercisePlan, getClientExercisePlan, createExercisePlan,
    updateExercisePlan, setExerciseDone, publishExercisePlan, deleteExercisePlan,
} from '../controllers/exercisePlans.controller.js'

const router = Router()
router.use(authenticate)

// ---- Diet-plan templates (admin-managed "General Diet Plans", max 4) ----
router.get('/diet-plan-templates', listTemplates)
router.get('/diet-plan-templates/:id', getTemplate)
router.post('/diet-plan-templates', authorize('admin'), createTemplate)
router.patch('/diet-plan-templates/:id', authorize('admin'), updateTemplate)
router.delete('/diet-plan-templates/:id', authorize('admin'), deleteTemplate)

// ---- Client-specific diet plans ----
router.get('/diet-plans', listDietPlans)
router.post('/diet-plans', authorize('trainer'), createDietPlan)
router.post('/diet-plans/from-template', authorize('trainer'), createFromTemplate)
router.get('/diet-plans/:id', getDietPlan)
router.patch('/diet-plans/:id', authorize('trainer'), updateDietPlan)
router.post('/diet-plans/:id/publish', authorize('trainer'), publishDietPlan)
router.delete('/diet-plans/:id', authorize('trainer'), deleteDietPlan)

// ---- Client-specific exercise plans ----
router.get('/exercise-plans', listExercisePlans)
router.post('/exercise-plans', authorize('trainer'), createExercisePlan)
router.get('/exercise-plans/:id', getExercisePlan)
router.patch('/exercise-plans/:id', authorize('trainer'), updateExercisePlan)
router.patch('/exercise-plans/:id/exercises/:exId', setExerciseDone) // client or trainer
router.post('/exercise-plans/:id/publish', authorize('trainer'), publishExercisePlan)
router.delete('/exercise-plans/:id', authorize('trainer'), deleteExercisePlan)

// ---- Convenience: a client's current published plans ----
router.get('/clients/:clientId/diet-plan', getClientDietPlan)
router.get('/clients/:clientId/exercise-plan', getClientExercisePlan)

export default router
