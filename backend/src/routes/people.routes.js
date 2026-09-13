import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listTrainers, getTrainer, createTrainer, updateTrainer, adjustCapacity, deleteTrainer,
} from '../controllers/trainers.controller.js'
import {
    listClients, getClient, createClient, updateClient, assignClient, deleteClient,
} from '../controllers/clients.controller.js'
import { listUsers, setUserStatus, resendInvite } from '../controllers/users.controller.js'
import { createAdmin } from '../controllers/admins.controller.js'
import {
    listMembers, getMember, createMember, updateMember, deleteMember,
} from '../controllers/members.controller.js'

const router = Router()
router.use(authenticate)

// ---- Users (unified admin table) ----
router.get('/users', authorize('admin', 'member'), listUsers)
router.patch('/users/:id/status', authorize('admin', 'member'), setUserStatus)
router.post('/users/:id/resend-invite', authorize('admin'), resendInvite)

// ---- Admins (Super Admin only — invite additional Admin accounts) ----
router.post('/admins', authorize('admin'), createAdmin)

// ---- Members (admin only — Admin -> Members -> Trainers -> Clients hierarchy) ----
router.get('/members', authorize('admin'), listMembers)
router.get('/members/:id', authorize('admin'), getMember)
router.post('/members', authorize('admin'), createMember)
router.patch('/members/:id', authorize('admin'), updateMember)
router.delete('/members/:id', authorize('admin'), deleteMember)

// ---- Trainers ----
router.get('/trainers', authorize('admin', 'member'), listTrainers)
router.get('/trainers/:id', authorize('admin', 'member', 'trainer'), getTrainer) // ':id' may be 'me'
router.post('/trainers', authorize('admin', 'member'), createTrainer)
router.patch('/trainers/:id', authorize('admin', 'member'), updateTrainer)
router.patch('/trainers/:id/capacity', authorize('admin', 'member'), adjustCapacity)
router.delete('/trainers/:id', authorize('admin', 'member'), deleteTrainer)

// ---- Clients ----
router.get('/clients', authorize('admin', 'member', 'trainer'), listClients)
router.get('/clients/:id', authorize('admin', 'member', 'trainer', 'client'), getClient) // ':id' may be 'me'
router.post('/clients', authorize('admin', 'member'), createClient)
router.patch('/clients/:id', authorize('admin', 'member', 'trainer', 'client'), updateClient)
router.patch('/clients/:id/assign', authorize('admin', 'member'), assignClient)
router.delete('/clients/:id', authorize('admin', 'member'), deleteClient)

export default router
