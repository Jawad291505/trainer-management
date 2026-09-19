import mongoose from 'mongoose'
import ApiError from './ApiError.js'
import { Client, Trainer } from '../models/index.js'

// Load a Client and enforce the caller's role scope, so every progress read
// shares one rule set:
//   admin   - any client
//   member  - clients of trainers they manage (Trainer.managedBy)
//   trainer - clients assigned to them
//   client  - only themselves (the id argument is ignored)
export async function assertClientAccess(req, clientId) {
    const { role } = req.user
    if (role === 'client') return req.client

    if (!clientId) throw ApiError.badRequest('client is required')
    if (!mongoose.isValidObjectId(clientId)) throw ApiError.badRequest('Invalid client id')

    const client = await Client.findById(clientId)
    if (!client) throw ApiError.notFound('Client not found')

    if (role === 'trainer') {
        if (String(client.trainer) !== String(req.trainer?._id)) {
            throw ApiError.forbidden('Client not assigned to you')
        }
    } else if (role === 'member') {
        const trainer = client.trainer ? await Trainer.findById(client.trainer, 'managedBy') : null
        if (!trainer || String(trainer.managedBy || '') !== String(req.member?._id)) {
            throw ApiError.forbidden('That client is outside your scope')
        }
    } else if (role !== 'admin') {
        throw ApiError.forbidden()
    }
    return client
}
