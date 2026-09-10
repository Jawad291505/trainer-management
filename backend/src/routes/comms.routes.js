import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listConversations, listMessages, sendMessage, markRead as markConversationRead,
} from '../controllers/messages.controller.js'
import {
    listNotifications, markRead, markAllRead,
} from '../controllers/notifications.controller.js'

const router = Router()
router.use(authenticate)

// ---- Chat ----
router.get('/conversations', authorize('trainer', 'client'), listConversations)
router.get('/conversations/messages', authorize('trainer', 'client'), listMessages) // ?client=<id>
router.post('/conversations/messages', authorize('trainer', 'client'), sendMessage)
router.get('/conversations/:id/messages', authorize('trainer', 'client'), listMessages)
router.patch('/conversations/:id/read', authorize('trainer', 'client'), markConversationRead)

// ---- Notifications (all roles) ----
router.get('/notifications', listNotifications)
router.patch('/notifications/read-all', markAllRead)
router.patch('/notifications/:id/read', markRead)

export default router
