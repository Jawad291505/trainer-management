import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listFoods, listFoodCategories, getThresholds, getFood,
    createFood, updateFood, deleteFood, computeFood,
} from '../controllers/foods.controller.js'
import {
    listExercises, listExerciseCategories, listTechniques, getExercise,
    createExercise, updateExercise, deleteExercise,
} from '../controllers/exercises.controller.js'
import {
    getConfig, updateConfig, compute, mealGl,
} from '../controllers/nutrition.controller.js'

const router = Router()
router.use(authenticate)

// ---- Foods (master data + trainer-custom) ----
router.get('/foods', listFoods)
router.get('/foods/categories', listFoodCategories)
router.get('/foods/thresholds', getThresholds)
router.get('/foods/:id', getFood)
router.post('/foods', authorize('admin', 'member', 'trainer'), createFood)
router.patch('/foods/:id', authorize('admin', 'member', 'trainer'), updateFood)
router.delete('/foods/:id', authorize('admin', 'member', 'trainer'), deleteFood)
router.post('/foods/:id/compute', computeFood)

// ---- Exercises (master data + trainer-custom) ----
router.get('/exercises', listExercises)
router.get('/exercises/categories', listExerciseCategories)
router.get('/exercises/techniques', listTechniques)
router.get('/exercises/:id', getExercise)
router.post('/exercises', authorize('admin', 'member', 'trainer'), createExercise)
router.patch('/exercises/:id', authorize('admin', 'member', 'trainer'), updateExercise)
router.delete('/exercises/:id', authorize('admin', 'member', 'trainer'), deleteExercise)

// ---- Nutrition config + ad-hoc calculators ----
router.get('/nutrition/config', getConfig)
router.put('/nutrition/config', authorize('admin', 'member'), updateConfig)
router.post('/nutrition/compute', compute)
router.post('/nutrition/meal-gl', mealGl)

export default router
