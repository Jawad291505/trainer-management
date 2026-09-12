import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listFollowUps, createFollowUp, updateFollowUp, deleteFollowUp,
} from '../controllers/followups.controller.js'
import {
    listCorrections, createCorrection, respondCorrection, cancelCorrection,
} from '../controllers/corrections.controller.js'
import {
    listPhotos, uploadPhoto, setPhotoNote, deletePhoto,
} from '../controllers/progressPhotos.controller.js'
import {
    getSchedule, addActivity, updateActivity, deleteActivity,
} from '../controllers/schedule.controller.js'
import {
    listWeight, addWeight, getDailyLog, setTask, setMealItem,
    logCheat, removeCheat, updateCheat, dailyHistory,
} from '../controllers/progress.controller.js'

const router = Router()
router.use(authenticate)

// ---- Follow-ups (trainer pipeline) ----
router.get('/followups', listFollowUps)
router.post('/followups', authorize('trainer'), createFollowUp)
router.patch('/followups/:id', authorize('trainer'), updateFollowUp)
router.delete('/followups/:id', authorize('trainer'), deleteFollowUp)

// ---- Correction requests (client -> trainer) ----
router.get('/corrections', listCorrections)
router.post('/corrections', authorize('client'), createCorrection)
router.patch('/corrections/:id', authorize('trainer'), respondCorrection)
router.delete('/corrections/:id', authorize('client'), cancelCorrection)

// ---- Progress photos ----
router.get('/progress-photos', listPhotos)
router.post('/progress-photos', authorize('client'), uploadPhoto)
router.patch('/progress-photos/:id/note', authorize('trainer'), setPhotoNote)
router.delete('/progress-photos/:id', authorize('client'), deletePhoto)

// ---- Schedule (trainer week grid / client today+upcoming) ----
router.get('/schedule', authorize('trainer', 'client'), getSchedule)
router.post('/schedule', authorize('trainer', 'client'), addActivity)
router.patch('/schedule/:id', authorize('trainer', 'client'), updateActivity)
router.delete('/schedule/:id', authorize('trainer', 'client'), deleteActivity)

// ---- Progress: weight journey + daily checklist ----
router.get('/progress/weight', listWeight)
router.post('/progress/weight', authorize('trainer', 'client'), addWeight)
router.get('/progress/daily/history', dailyHistory)
router.get('/progress/daily', getDailyLog)
router.patch('/progress/daily', authorize('client'), setTask)
router.patch('/progress/daily/meal-item', authorize('client'), setMealItem)
router.post('/progress/daily/cheat', authorize('client'), logCheat)
router.patch('/progress/daily/cheat/:mealId', authorize('client'), updateCheat)
router.delete('/progress/daily/cheat/:mealId', authorize('client'), removeCheat)

export default router
