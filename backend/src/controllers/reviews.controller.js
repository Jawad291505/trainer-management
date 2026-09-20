import mongoose from 'mongoose'
import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { Review, Client, Trainer, User, Notification } from '../models/index.js'
import { REVIEW_MAX_RATING, REVIEW_MAX_COMMENT } from '../config/constants.js'
import { escapeRegex, pageParams, pagedBody } from '../utils/pagination.js'

const POPULATE = [
    { path: 'client', populate: { path: 'user', select: 'name avatarColor' } },
    { path: 'trainer', populate: { path: 'user', select: 'name avatarColor' } },
]

// Flat shape the front-ends read (`id`, `clientName`, ...).
function serialize(r) {
    return {
        id: String(r._id),
        clientId: String(r.client?._id || r.client),
        clientName: r.client?.user?.name,
        clientAvatarColor: r.client?.user?.avatarColor,
        trainerId: String(r.trainer?._id || r.trainer),
        trainerName: r.trainer?.user?.name,
        trainerAvatarColor: r.trainer?.user?.avatarColor,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    }
}

// { average, count, distribution: { 5: n, 4: n, ... } } for a filter.
async function summarize(filter) {
    const rows = await Review.aggregate([{ $match: filter }, { $group: { _id: '$rating', n: { $sum: 1 } } }])
    const distribution = {}
    for (let s = REVIEW_MAX_RATING; s >= 1; s--) distribution[s] = 0
    let count = 0
    let sum = 0
    for (const { _id, n } of rows) {
        distribution[_id] = n
        count += n
        sum += _id * n
    }
    return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution }
}

// Keep Trainer.rating (shown on the admin trainer list/detail) in step with the reviews.
async function syncTrainerRating(trainerId) {
    const { average, count } = await summarize({ trainer: trainerId })
    if (count) await Trainer.updateOne({ _id: trainerId }, { rating: average })
}

const asObjectId = (id) => new mongoose.Types.ObjectId(id)

// GET /api/reviews?trainer=&rating=&search=&page=&limit=
//   client:  their own reviews (+ `trainer`, the one they can currently review, and `current`, their review of it)
//   trainer: reviews written about them
//   member:  reviews of their own trainers
//   admin:   reviews of every trainer
// `summary` (average / count / star distribution) covers the whole scope + trainer/search
// filters but ignores `rating`, so the breakdown stays meaningful while filtering by a star.
export const listReviews = asyncHandler(async (req, res) => {
    const { role } = req.user
    const { trainer: trainerQuery, rating, search } = req.query
    const filter = {}

    if (role === 'client') {
        filter.client = req.client._id
    } else if (role === 'trainer') {
        filter.trainer = req.trainer._id
    } else {
        let scope = null // null = unrestricted (admin)
        if (role === 'member') {
            scope = (await Trainer.find({ managedBy: req.member._id }, '_id')).map((t) => String(t._id))
        }
        if (trainerQuery && trainerQuery !== 'all') {
            if (!mongoose.isValidObjectId(trainerQuery)) throw ApiError.badRequest('Invalid trainer id')
            // Narrowing to one trainer must stay inside a member's own scope.
            scope = scope ? scope.filter((id) => id === trainerQuery) : [trainerQuery]
        }
        if (scope) filter.trainer = { $in: scope.map(asObjectId) }
    }

    // Free-text search over the client's (or, for admin/member, the trainer's) name.
    if (search && role !== 'client') {
        const users = await User.find({ name: new RegExp(escapeRegex(search), 'i'), role: { $in: ['client', 'trainer'] } }, '_id')
        const ids = users.map((u) => u._id)
        const [clients, trainers] = await Promise.all([
            Client.find({ user: { $in: ids } }, '_id'),
            role === 'trainer' ? [] : Trainer.find({ user: { $in: ids } }, '_id'),
        ])
        const or = [{ client: { $in: clients.map((c) => c._id) } }]
        if (trainers.length) or.push({ trainer: { $in: trainers.map((t) => t._id) } })
        filter.$or = or
    }

    const summary = role === 'client' ? undefined : await summarize(filter)

    const listFilter = { ...filter }
    if (rating) {
        const n = Number(rating)
        if (!Number.isInteger(n) || n < 1 || n > REVIEW_MAX_RATING) throw ApiError.badRequest('Invalid rating filter')
        listFilter.rating = n
    }

    const paging = pageParams(req.query)
    let query = Review.find(listFilter).populate(POPULATE).sort({ createdAt: -1 })
    if (paging) query = query.skip(paging.skip).limit(paging.limit)
    const [docs, total] = await Promise.all([query, paging ? Review.countDocuments(listFilter) : null])
    const items = docs.map(serialize)

    const body = paging ? pagedBody(items, total, paging) : { count: items.length, items }
    if (summary) body.summary = summary

    if (role === 'client') {
        const client = await Client.findById(req.client._id, 'trainer').populate({ path: 'trainer', populate: { path: 'user', select: 'name avatarColor' } })
        const trainer = client?.trainer
        body.trainer = trainer ? { id: String(trainer._id), name: trainer.user?.name, avatarColor: trainer.user?.avatarColor } : null
        body.current = trainer ? items.find((r) => r.trainerId === String(trainer._id)) || null : null
    }
    res.json(body)
})

// POST /api/reviews   (client)   Body: { rating: 1-5, comment? }
// Reviews the client's currently assigned trainer. Submitting again updates the
// existing review (one per client/trainer pair) instead of adding another.
export const submitReview = asyncHandler(async (req, res) => {
    const rating = Number(req.body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > REVIEW_MAX_RATING) {
        throw ApiError.badRequest(`rating must be a whole number from 1 to ${REVIEW_MAX_RATING}`)
    }
    const comment = String(req.body.comment ?? '').trim()
    if (comment.length > REVIEW_MAX_COMMENT) throw ApiError.badRequest(`Comment must be ${REVIEW_MAX_COMMENT} characters or fewer`)

    const client = await Client.findById(req.client._id, 'trainer')
    if (!client?.trainer) throw ApiError.badRequest('You have no assigned trainer to review')

    const result = await Review.findOneAndUpdate(
        { client: client._id, trainer: client.trainer },
        { $set: { rating, comment } },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, includeResultMetadata: true },
    )
    const created = !result.lastErrorObject?.updatedExisting
    const review = await result.value.populate(POPULATE)

    await syncTrainerRating(client.trainer)

    const trainer = await Trainer.findById(client.trainer, 'user')
    await Notification.create({
        user: trainer.user,
        role: 'trainer',
        type: 'review',
        title: created ? 'New review' : 'Review updated',
        description: `${req.user.name} rated you ${rating}/${REVIEW_MAX_RATING}${comment ? `: ${comment.slice(0, 80)}` : ''}`,
        ref: { kind: 'review', id: review._id },
    })

    res.status(created ? 201 : 200).json(serialize(review))
})
