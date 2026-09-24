import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listPayments, createPayment, updatePayment,
} from '../controllers/payments.controller.js'
import {
    listResources, createResource, updateResource, deleteResource,
} from '../controllers/resources.controller.js'
import { overview, myReferrals, redeem } from '../controllers/referrals.controller.js'
import * as memberReferrals from '../controllers/memberReferrals.controller.js'
import {
    adminStats, adminDashboard, revenueTrend, memberStats, memberDashboard, trainerStats, clientCompletion,
} from '../controllers/stats.controller.js'
import {
    listPlans, createPlan, updatePlan, deletePlan,
} from '../controllers/subscriptionPlans.controller.js'
import {
    listMemberPayments, approveMemberPayment, rejectMemberPayment, renewSubscription,
} from '../controllers/memberPayments.controller.js'
import { getBankDetails } from '../controllers/organization.controller.js'

const router = Router()
router.use(authenticate)

// ---- Payments & Sales (admin only — explicitly excluded from the Member role) ----
router.get('/payments', authorize('admin'), listPayments)
router.post('/payments', authorize('admin'), createPayment)
router.patch('/payments/:id', authorize('admin'), updatePayment)

// ---- Library resources (admin/member manage, everyone reads active) ----
router.get('/resources', listResources)
router.post('/resources', authorize('admin', 'member'), createResource)
router.patch('/resources/:id', authorize('admin', 'member'), updateResource)
router.delete('/resources/:id', authorize('admin', 'member'), deleteResource)

// ---- Referrals ----
router.get('/referrals/overview', authorize('admin'), overview)
router.get('/referrals/me', authorize('trainer'), myReferrals)
router.post('/referrals/redeem', authorize('trainer'), redeem)
router.get('/member-referrals/overview', authorize('admin'), memberReferrals.overview)
router.get('/member-referrals/me', authorize('member'), memberReferrals.mine)
router.patch('/member-referrals/:id', authorize('admin'), memberReferrals.updateStatus)

// ---- Subscription plans (Member self-signup) — Admin manages, anyone
// authenticated can read (Members need the list mid-signup) ----
router.get('/subscription-plans', listPlans)
router.post('/subscription-plans', authorize('admin'), createPlan)
router.patch('/subscription-plans/:id', authorize('admin'), updatePlan)
router.delete('/subscription-plans/:id', authorize('admin'), deletePlan)

// ---- Organization bank details (shown on the Member payment-submission page) ----
router.get('/organization/bank-details', getBankDetails)

// ---- Member payment approvals (admin only — Payments/Sales-adjacent) ----
router.get('/member-payments', authorize('admin'), listMemberPayments)
router.patch('/member-payments/:id/approve', authorize('admin'), approveMemberPayment)
router.patch('/member-payments/:id/reject', authorize('admin'), rejectMemberPayment)
router.post('/member-payments/:memberId/renew', authorize('admin'), renewSubscription)

// ---- Stats / dashboards ----
router.get('/stats/admin', authorize('admin'), adminStats)
router.get('/stats/admin/dashboard', authorize('admin'), adminDashboard)
router.get('/stats/admin/revenue-trend', authorize('admin'), revenueTrend)
router.get('/stats/member', authorize('member'), memberStats)
router.get('/stats/member/dashboard', authorize('member'), memberDashboard)
router.get('/stats/trainer', authorize('trainer'), trainerStats)
router.get('/stats/client/completion', authorize('client', 'trainer', 'admin', 'member'), clientCompletion)

export default router
