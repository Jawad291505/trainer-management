import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { register, login, me, updateMe } from '../controllers/auth.controller.js'
import { forgotPassword, verifyResetOtp, resetPassword } from '../controllers/passwordReset.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)

// Forgot password (members, trainers, clients — never admins): email OTP -> verify -> new password.
router.post('/forgot-password', forgotPassword)
router.post('/verify-reset-otp', verifyResetOtp)
router.post('/reset-password', resetPassword)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)

export default router
