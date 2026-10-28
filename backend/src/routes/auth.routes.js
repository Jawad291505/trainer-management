import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { register, login, me, updateMe, uploadMyAvatar, removeMyAvatar } from '../controllers/auth.controller.js'
import { uploadImage } from '../middlewares/upload.js'
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
router.post('/me/avatar', authenticate, uploadImage.single('image'), uploadMyAvatar)
router.delete('/me/avatar', authenticate, removeMyAvatar)

export default router
