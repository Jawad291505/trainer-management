import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { uploadImage } from '../middlewares/upload.js'
import { signup, verifyOtp, resendOtp, selectPlan } from '../controllers/memberSignup.controller.js'
import { submitPayment, myPayments } from '../controllers/memberPayments.controller.js'

const router = Router()

// ---- Member self-signup: Signup -> OTP -> Plan -> Payment -> Pending Approval ----
router.post('/member-signup', signup) // public — creates the account
router.post('/member-signup/verify-otp', authenticate, verifyOtp)
router.post('/member-signup/resend-otp', authenticate, resendOtp)
router.post('/member-signup/select-plan', authenticate, selectPlan)

router.post('/member-payments', authenticate, uploadImage.single('screenshot'), submitPayment)
router.get('/member-payments/me', authenticate, myPayments)

export default router
