import { Router } from 'express'
import authRoutes from './auth.routes.js'
import libraryRoutes from './library.routes.js'
import plansRoutes from './plans.routes.js'
import peopleRoutes from './people.routes.js'
import workflowRoutes from './workflow.routes.js'
import commsRoutes from './comms.routes.js'
import adminRoutes from './admin.routes.js'

const api = Router()

api.get('/health', (_req, res) => res.json({ ok: true, service: 'fittrack-backend', ts: Date.now() }))

api.use('/auth', authRoutes)
api.use('/', libraryRoutes)
api.use('/', plansRoutes)
api.use('/', peopleRoutes)
api.use('/', workflowRoutes)
api.use('/', commsRoutes)
api.use('/', adminRoutes)

export default api
