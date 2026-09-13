import { Router } from 'express'
import authRoutes from './auth.routes.js'
import libraryRoutes from './library.routes.js'
import plansRoutes from './plans.routes.js'
import peopleRoutes from './people.routes.js'
import workflowRoutes from './workflow.routes.js'
import commsRoutes from './comms.routes.js'
import adminRoutes from './admin.routes.js'
import memberSignupRoutes from './memberSignup.routes.js'

const api = Router()

api.get('/health', (_req, res) => res.json({ ok: true, service: 'fittrack-backend', ts: Date.now() }))

api.use('/auth', authRoutes)
// Mounted before the routers below: POST /member-signup is public (no Bearer
// token), but library/plans/people/workflow/comms/admin routes each start
// with an unconditional `router.use(authenticate)` that — since they're also
// mounted at '/' — runs for every request that reaches them, matching route
// or not. Registered first, memberSignupRoutes' own routes are resolved
// before any of those blanket authenticate() calls ever run.
api.use('/', memberSignupRoutes)
api.use('/', libraryRoutes)
api.use('/', plansRoutes)
api.use('/', peopleRoutes)
api.use('/', workflowRoutes)
api.use('/', commsRoutes)
api.use('/', adminRoutes)

export default api
