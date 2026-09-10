import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { register, login, me, updateMe } from '../controllers/auth.controller.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, me)
router.patch('/me', authenticate, updateMe)

export default router
