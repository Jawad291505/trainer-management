import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
    listTrainers, getTrainer, createTrainer, updateTrainer, adjustCapacity, deleteTrainer,
} from '../controllers/trainers.controller.js'
import {
    listClients, getClient, createClient, updateClient, assignClient, deleteClient,
} from '../controllers/clients.controller.js'
import { listUsers, setUserStatus } from '../controllers/users.controller.js'

const router = Router()
router.use(authenticate)

// ---- Users (unified admin table) ----
router.get('/users', authorize('admin'), listUsers)
router.patch('/users/:id/status', authorize('admin'), setUserStatus)

// ---- Trainers ----
router.get('/trainers', authorize('admin'), listTrainers)
router.get('/trainers/:id', authorize('admin', 'trainer'), getTrainer) // ':id' may be 'me'
router.post('/trainers', authorize('admin'), createTrainer)
router.patch('/trainers/:id', authorize('admin'), updateTrainer)
router.patch('/trainers/:id/capacity', authorize('admin'), adjustCapacity)
router.delete('/trainers/:id', authorize('admin'), deleteTrainer)

// ---- Clients ----
router.get('/clients', authorize('admin', 'trainer'), listClients)
router.get('/clients/:id', authorize('admin', 'trainer', 'client'), getClient) // ':id' may be 'me'
router.post('/clients', authorize('admin'), createClient)
router.patch('/clients/:id', authorize('admin', 'client'), updateClient)
router.patch('/clients/:id/assign', authorize('admin'), assignClient)
router.delete('/clients/:id', authorize('admin'), deleteClient)

export default router
