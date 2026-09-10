import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listPayments, createPayment, updatePayment,
} from '../controllers/payments.controller.js'
import {
    listResources, createResource, updateResource, deleteResource,
} from '../controllers/resources.controller.js'
import { overview, myReferrals, redeem } from '../controllers/referrals.controller.js'
import {
    adminStats, revenueTrend, trainerStats, clientCompletion,
} from '../controllers/stats.controller.js'

const router = Router()
router.use(authenticate)

// ---- Payments (admin) ----
router.get('/payments', authorize('admin'), listPayments)
router.post('/payments', authorize('admin'), createPayment)
router.patch('/payments/:id', authorize('admin'), updatePayment)

// ---- Library resources (admin manages, everyone reads active) ----
router.get('/resources', listResources)
router.post('/resources', authorize('admin'), createResource)
router.patch('/resources/:id', authorize('admin'), updateResource)
router.delete('/resources/:id', authorize('admin'), deleteResource)

// ---- Referrals ----
router.get('/referrals/overview', authorize('admin'), overview)
router.get('/referrals/me', authorize('trainer'), myReferrals)
router.post('/referrals/redeem', authorize('trainer'), redeem)

// ---- Stats / dashboards ----
router.get('/stats/admin', authorize('admin'), adminStats)
router.get('/stats/admin/revenue-trend', authorize('admin'), revenueTrend)
router.get('/stats/trainer', authorize('trainer'), trainerStats)
router.get('/stats/client/completion', authorize('client', 'trainer', 'admin'), clientCompletion)

export default router
