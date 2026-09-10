import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Payment } from '../models/index.js'
import { PLAN_PRICES } from '../config/constants.js'

// GET /api/payments?status=&trainer=&client=&method=&from=&to=   (admin)
export const listPayments = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    if (req.query.trainer) filter.trainer = req.query.trainer
    if (req.query.client) filter.client = req.query.client
    if (req.query.method) filter.method = req.query.method
    if (req.query.from || req.query.to) {
        filter.date = {}
        if (req.query.from) filter.date.$gte = new Date(req.query.from)
        if (req.query.to) filter.date.$lte = new Date(req.query.to)
    }

    const payments = await Payment.find(filter)
        .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
        .sort({ date: -1 })

    res.json({
        count: payments.length,
        items: payments.map((p) => ({
            id: String(p._id),
            clientName: p.client?.user?.name,
            clientAvatar: p.client?.user?.avatarColor,
            trainerName: p.trainer?.user?.name || '—',
            plan: p.plan,
            amount: p.amount,
            date: p.date,
            status: p.status,
            method: p.method,
            txnId: p.txnId,
        })),
    })
})

// POST /api/payments   (admin) — record a payment
export const createPayment = asyncHandler(async (req, res) => {
    const { client, trainer, plan, status, method, date } = req.body
    if (!client || !plan) throw ApiError.badRequest('client and plan are required')

    const payment = await Payment.create({
        client,
        trainer: trainer || null,
        plan,
        amount: req.body.amount ?? PLAN_PRICES[plan] ?? 0,
        date: date ? new Date(date) : new Date(),
        status: status || 'pending',
        method: method || '',
        txnId: req.body.txnId || `txn_${Math.floor(Math.random() * 900000 + 100000)}`,
    })
    res.status(201).json(payment)
})

// PATCH /api/payments/:id   (admin) — usually a status change (refund / retry)
export const updatePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
    if (!payment) throw ApiError.notFound('Payment not found')
    for (const k of ['status', 'method', 'amount']) if (req.body[k] !== undefined) payment[k] = req.body[k]
    await payment.save()
    res.json(payment)
})
