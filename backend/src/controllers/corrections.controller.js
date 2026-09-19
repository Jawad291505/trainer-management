import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import {
    CorrectionRequest, Client, Trainer, Notification, DietPlan, ExercisePlan,
} from '../models/index.js'
import { CORRECTION_TARGET_KINDS, CORRECTION_STALE_HOURS } from '../config/constants.js'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const HOUR_MS = 60 * 60 * 1000

// Only diet / exercise requests can be answered by editing a plan.
const PLAN_MODEL = { diet: DietPlan, exercise: ExercisePlan }

// When each client's *published* plan was last saved (publishing bumps it too).
// A draft edit doesn't count — the client can't see it yet.
async function planUpdatedAtByClient(area, clientIds) {
    const Model = PLAN_MODEL[area]
    if (!Model || !clientIds.length) return new Map()
    const plans = await Model.find({ client: { $in: clientIds }, status: 'published' }, 'client updatedAt')
    return new Map(plans.map((p) => [String(p.client), p.updatedAt]))
}

// Flat shape the three front-ends read (`id`, `clientId`, ...) — the raw
// document has `_id` and a populated `client`, which is not what they expect.
function serialize(r, planUpdated) {
    const open = r.status === 'open'
    const updated = PLAN_MODEL[r.area] ? planUpdated?.get(String(r.client?._id || r.client)) : undefined
    return {
        id: String(r._id),
        clientId: String(r.client?._id || r.client),
        clientName: r.client?.user?.name,
        avatarColor: r.client?.user?.avatarColor,
        area: r.area,
        item: r.item,
        type: r.type,
        note: r.note,
        target: r.target?.kind
            ? { kind: r.target.kind, refId: r.target.refId ? String(r.target.refId) : null, date: r.target.date || '' }
            : null,
        priority: r.priority,
        status: r.status,
        reply: r.reply,
        seenAt: r.seenAt,
        planChanged: r.planChanged,
        // For open diet/exercise requests: has the published plan been edited since?
        // null = not applicable (progress / general requests).
        planChangedSince: open && PLAN_MODEL[r.area] ? !!updated && updated > r.createdAt : null,
        stale: open && Date.now() - new Date(r.createdAt).getTime() > CORRECTION_STALE_HOURS * HOUR_MS,
        createdAt: r.createdAt,
        resolvedAt: r.resolvedAt,
    }
}

// Response body for a single request: populated like the list, so the client
// name and plan-changed flag survive when the front-end swaps it into its state.
async function respond(rq) {
    await rq.populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
    const plans = rq.status === 'open' ? await planUpdatedAtByClient(rq.area, [rq.client._id]) : undefined
    return serialize(rq, plans)
}

async function loadScoped(req, id) {
    const rq = await CorrectionRequest.findById(id)
    if (!rq) throw ApiError.notFound('Request not found')
    return rq
}

// GET /api/corrections?status=&client=
// client: own;  trainer: for their clients;  member: their trainers' clients;  admin: all
export const listCorrections = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.user.role === 'client') filter.client = req.client._id
    else if (req.user.role === 'trainer') filter.trainer = req.trainer._id
    else if (req.user.role === 'member') {
        const trainers = await Trainer.find({ managedBy: req.member._id }, '_id')
        filter.trainer = { $in: trainers.map((t) => t._id) }
    }
    if (req.query.status) filter.status = req.query.status
    if (req.query.client && req.user.role !== 'client') filter.client = req.query.client

    const docs = await CorrectionRequest.find(filter)
        .populate({ path: 'client', populate: { path: 'user', select: 'name avatarColor' } })
        .sort({ createdAt: -1 })

    // One published-plan lookup per area, not per request.
    const plans = new Map()
    for (const area of Object.keys(PLAN_MODEL)) {
        const ids = [...new Set(docs.filter((d) => d.area === area && d.status === 'open').map((d) => String(d.client._id)))]
        plans.set(area, await planUpdatedAtByClient(area, ids))
    }
    const items = docs.map((d) => serialize(d, plans.get(d.area)))

    res.json({
        count: items.length,
        openCount: items.filter((r) => r.status === 'open').length,
        items,
    })
})

// POST /api/corrections   (client)  Body: { area, item, type, note, target?: { kind, refId, date } }
export const createCorrection = asyncHandler(async (req, res) => {
    const { area, item, type, note, target } = req.body
    if (!area || !type || !note?.trim()) throw ApiError.badRequest('area, type and note are required')

    const client = await Client.findById(req.client._id)
    if (!client.trainer) throw ApiError.badRequest('You have no assigned trainer to send this to')

    let cleanTarget
    if (target?.kind) {
        if (!CORRECTION_TARGET_KINDS.includes(target.kind)) throw ApiError.badRequest('Invalid target kind')
        if (target.date && !DATE_RE.test(target.date)) throw ApiError.badRequest('target.date must be YYYY-MM-DD')
        cleanTarget = { kind: target.kind, refId: target.refId || null, date: target.date || '' }
    }

    // Backstop for double-taps / retries: an identical request sent in the last
    // 30s is the same request, so return it instead of creating a duplicate.
    const dup = await CorrectionRequest.findOne({
        client: client._id, area, type, item: item || '', note: note.trim(), status: 'open',
        createdAt: { $gte: new Date(Date.now() - 30 * 1000) },
    })
    if (dup) return res.status(200).json(await respond(dup))

    const priority = type === 'injury' ? 'high' : 'normal'
    const rq = await CorrectionRequest.create({
        client: client._id,
        trainer: client.trainer,
        area,
        item: item || '',
        type,
        note: note.trim(),
        priority,
        ...(cleanTarget ? { target: cleanTarget } : {}),
    })

    const trainer = await Trainer.findById(client.trainer, 'user')
    await Notification.create({
        user: trainer.user,
        role: 'trainer',
        type: 'correction',
        title: priority === 'high' ? 'Injury / pain request — needs attention' : 'New correction request',
        description: `${req.user.name}: ${note.trim().slice(0, 80)}`,
        ref: { kind: 'correction', id: rq._id },
    })
    res.status(201).json(await respond(rq))
})

// PATCH /api/corrections/:id   (trainer)
// Body: { action: 'seen' | 'resolve' | 'decline' | 'reopen', reply?, withoutChange? }
//   seen     - the trainer has looked at it (idempotent; only stamps the first time)
//   resolve  - needs a reply. For diet/exercise requests the published plan must
//              have been edited since the request was raised, unless the trainer
//              confirms with withoutChange: true (e.g. "explained, no change needed").
//   decline  - needs a reply explaining why
//   reopen   - back to open
export const respondCorrection = asyncHandler(async (req, res) => {
    const rq = await loadScoped(req, req.params.id)
    if (String(rq.trainer) !== String(req.trainer._id)) throw ApiError.forbidden()

    const { action, withoutChange } = req.body
    const reply = (req.body.reply || '').trim()

    if (action === 'seen') {
        if (!rq.seenAt) {
            rq.seenAt = new Date()
            await rq.save()
        }
        return res.json(await respond(rq))
    }

    if (action === 'resolve' || action === 'decline') {
        if (rq.status !== 'open') throw ApiError.badRequest('This request is already answered — reopen it first')
        if (!reply) throw ApiError.badRequest('A reply is required')

        if (action === 'resolve') {
            let planChanged = null
            if (PLAN_MODEL[rq.area]) {
                const updated = (await planUpdatedAtByClient(rq.area, [rq.client])).get(String(rq.client))
                planChanged = !!updated && updated > rq.createdAt
                if (!planChanged && !withoutChange) {
                    throw new ApiError(
                        409,
                        `The client's ${rq.area} plan hasn't been updated since this request. Edit and publish the plan, or confirm you're resolving without a change.`,
                        undefined,
                        'PLAN_NOT_CHANGED',
                    )
                }
            }
            rq.planChanged = planChanged
        } else {
            rq.planChanged = null
        }
        rq.status = action === 'resolve' ? 'resolved' : 'declined'
        rq.reply = reply
        rq.resolvedAt = new Date()
        rq.seenAt ??= rq.resolvedAt
    } else if (action === 'reopen') {
        rq.status = 'open'
        rq.reply = ''
        rq.resolvedAt = null
        rq.planChanged = null
    } else {
        throw ApiError.badRequest('action must be seen | resolve | decline | reopen')
    }
    await rq.save()

    if (action !== 'reopen') {
        const client = await Client.findById(rq.client)
        await Notification.create({
            user: client.user,
            role: 'client',
            type: 'correction',
            title: action === 'resolve' ? 'Correction resolved' : 'Correction declined',
            description: rq.reply,
            ref: { kind: 'correction', id: rq._id },
        })
    }
    res.json(await respond(rq))
})

// DELETE /api/corrections/:id   (client, only while still open)
export const cancelCorrection = asyncHandler(async (req, res) => {
    const rq = await loadScoped(req, req.params.id)
    if (String(rq.client) !== String(req.client._id)) throw ApiError.forbidden()
    if (rq.status !== 'open') throw ApiError.badRequest('Only open requests can be cancelled')
    await rq.deleteOne()
    res.json({ ok: true })
})
