import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { MemberReferral } from '../models/index.js'
import { REIMBURSEMENT_STATUS } from '../config/constants.js'
import { notifyMember } from '../services/notify.service.js'
import { pageParams } from '../utils/pagination.js'
import { getMemberReferralOverview, getMyMemberReferrals } from '../services/memberReferral.service.js'

// GET /api/member-referrals/overview?search=&status=&page=&limit=   (admin)
export const overview = asyncHandler(async (req, res) => {
    const out = await getMemberReferralOverview({ search: req.query.search, status: req.query.status, paging: pageParams(req.query) })
    res.json({ ...out, items: out.rows })
})

// GET /api/member-referrals/me   (member)
export const mine = asyncHandler(async (req, res) => {
    res.json(await getMyMemberReferrals(req.member))
})

// PATCH /api/member-referrals/:id   (admin)  Body: { status, note? }
export const updateStatus = asyncHandler(async (req, res) => {
    const { status, note } = req.body
    if (!REIMBURSEMENT_STATUS.includes(status)) throw ApiError.badRequest('Invalid status')
    const ref = await MemberReferral.findById(req.params.id)
    if (!ref) throw ApiError.notFound('Referral not found')
    let statusChanged = false
    if (ref.status !== status) {
        ref.status = status
        ref.statusChangedAt = new Date()
        statusChanged = true
    }
    if (note !== undefined) ref.note = note
    await ref.save()
    if (statusChanged && status !== 'pending') {
        await notifyMember(ref.referrer, {
            type: 'referral',
            title: status === 'reimbursed' ? 'Referral reimbursed' : 'Referral not eligible',
            description: status === 'reimbursed' ? 'Your referral reward has been reimbursed.' : 'A referral reimbursement was marked as rejected.',
        })
    }
    res.json({ id: String(ref._id), status: ref.status, statusChangedAt: ref.statusChangedAt, note: ref.note })
})
