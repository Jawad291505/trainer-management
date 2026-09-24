import { Member, MemberReferral } from '../models/index.js'
import { generateReferralCode } from './referral.service.js'
import ApiError from '../utils/ApiError.js'
import { pagedBody } from '../utils/pagination.js'

const userPop = { path: 'user', select: 'name email' }

// Issue a member's code exactly ONCE; existing members get theirs lazily.
export async function ensureMemberReferralCode(member) {
    if (member.referralCode) return member.referralCode
    const { user } = await member.populate('user', 'name')
    let code
    for (let attempt = 0; attempt < 6; attempt += 1) {
        code = generateReferralCode(user?.name || 'MEMBER')
        if (!(await Member.exists({ referralCode: code }))) break
    }
    member.referralCode = code
    await member.save()
    return code
}

// Look up the referrer for a signup code; throws a 400 for an unknown code.
export async function findReferrerByCode(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase()
    if (!code) return null
    const referrer = await Member.findOne({ referralCode: code })
    if (!referrer) throw ApiError.badRequest('That referral code was not recognised')
    return referrer
}

export async function recordMemberReferral(referrer, referee) {
    referee.referredBy = referrer._id
    await referee.save()
    return MemberReferral.create({ referrer: referrer._id, referee: referee._id, code: referrer.referralCode })
}

// Admin table + stats. Filters/paging run here.
export async function getMemberReferralOverview({ search = '', status = 'all', paging = null } = {}) {
    const all = await MemberReferral.find({})
        .populate({ path: 'referrer referee', populate: userPop })
        .sort({ date: -1 })

    const rowsAll = all.filter((r) => r.referrer && r.referee).map((r) => ({
        id: String(r._id),
        code: r.code,
        date: r.date,
        status: r.status,
        statusChangedAt: r.statusChangedAt,
        note: r.note,
        referrerName: r.referrer.user?.name || '—',
        referrerEmail: r.referrer.user?.email || '',
        refereeName: r.referee.user?.name || '—',
        refereeEmail: r.referee.user?.email || '',
        refereeAccount: r.referee.status, // 'pending' until their first payment is approved
    }))

    const needle = String(search).trim().toLowerCase()
    const rows = rowsAll.filter((r) => (status === 'all' || !status || r.status === status)
        && (!needle || [r.referrerName, r.refereeName, r.referrerEmail, r.refereeEmail, r.code].some((v) => String(v).toLowerCase().includes(needle))))

    const count = (s) => rowsAll.filter((r) => r.status === s).length
    return {
        rows: paging ? rows.slice(paging.skip, paging.skip + paging.limit) : rows,
        ...(paging ? (({ items: _i, ...meta }) => meta)(pagedBody([], rows.length, paging)) : {}),
        stats: { total: rowsAll.length, pending: count('pending'), reimbursed: count('reimbursed'), rejected: count('rejected') },
    }
}

// The signed-in member's own code and referrals.
export async function getMyMemberReferrals(member) {
    const code = await ensureMemberReferralCode(member)
    const [byRec, made] = await Promise.all([
        MemberReferral.findOne({ referee: member._id }).populate({ path: 'referrer', populate: userPop }),
        MemberReferral.find({ referrer: member._id }).populate({ path: 'referee', populate: userPop }).sort({ date: -1 }),
    ])
    return {
        code,
        referredBy: byRec?.referrer ? { name: byRec.referrer.user?.name, date: byRec.date } : null,
        referred: made.filter((r) => r.referee).map((r) => ({
            id: String(r._id),
            name: r.referee.user?.name,
            date: r.date,
            status: r.status,
        })),
    }
}
