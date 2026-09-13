import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Member, Trainer, Client } from '../models/index.js'
import { reissueInvite } from '../services/invite.service.js'

// Resolve the User ids a member is allowed to see: themselves, their trainers,
// and those trainers' clients.
async function memberScopeUserIds(memberId) {
    const trainers = await Trainer.find({ managedBy: memberId }, 'user')
    const trainerUserIds = trainers.map((t) => t.user)
    const clients = await Client.find({ trainer: { $in: trainers.map((t) => t._id) } }, 'user')
    return [...trainerUserIds, ...clients.map((c) => c.user)]
}

// GET /api/users?role=&status=&search=   (admin: everyone; member: their own scope)
// The unified Users table (admin/src/portals/admin/pages/Users.jsx): admins +
// members + trainers + clients in one list, each row carrying its assigned trainer name.
export const listUsers = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.role) filter.role = req.query.role
    if (req.query.status) filter.status = req.query.status
    if (req.query.search) {
        const rx = { $regex: String(req.query.search).trim(), $options: 'i' }
        filter.$or = [{ name: rx }, { email: rx }]
    }
    if (req.user.role === 'member') {
        filter._id = { $in: [req.user._id, ...(await memberScopeUserIds(req.member._id))] }
    }

    const users = await User.find(filter).sort({ createdAt: -1 })

    // Resolve assigned-trainer name for client rows in one pass.
    const clients = await Client.find({ user: { $in: users.filter((u) => u.role === 'client').map((u) => u._id) } })
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
    const trainerNameByUser = new Map(clients.map((c) => [String(c.user), c.trainer?.user?.name || '—']))
    const clientIdByUser = new Map(clients.map((c) => [String(c.user), String(c._id)]))

    // The row's `id` is the User id (needed for /users/:id/status etc.) which is
    // NOT the same document as the Trainer/Client/Member profile it links to —
    // resolve those separately so "View profile" can navigate to the right id.
    const [trainerDocs, memberDocs] = await Promise.all([
        Trainer.find({ user: { $in: users.filter((u) => u.role === 'trainer').map((u) => u._id) } }, 'user'),
        Member.find({ user: { $in: users.filter((u) => u.role === 'member').map((u) => u._id) } }, 'user'),
    ])
    const trainerIdByUser = new Map(trainerDocs.map((t) => [String(t.user), String(t._id)]))
    const memberIdByUser = new Map(memberDocs.map((m) => [String(m.user), String(m._id)]))

    const roleLabel = { admin: 'Super Admin', member: 'Member', trainer: 'Trainer', client: 'Client' }
    res.json({
        count: users.length,
        items: users.map((u) => ({
            id: String(u._id),
            profileId: u.role === 'trainer' ? trainerIdByUser.get(String(u._id))
                : u.role === 'client' ? clientIdByUser.get(String(u._id))
                : u.role === 'member' ? memberIdByUser.get(String(u._id))
                : null,
            name: u.name,
            email: u.email,
            role: roleLabel[u.role] || u.role,
            roleKey: u.role,
            status: u.status,
            avatarColor: u.avatarColor,
            trainerName: u.role === 'client' ? trainerNameByUser.get(String(u._id)) || '—' : '—',
            mustChangePassword: u.mustChangePassword,
            joinDate: u.joinDate,
            lastActivity: u.lastActivity,
        })),
    })
})

// POST /api/users/:id/resend-invite   (admin only) — re-issue a fresh temp
// password (expired/lost invite) and re-send it through Resend. Reusable
// across Admin, Member, Trainer and Client accounts alike.
export const resendInvite = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('+passwordHash')
    if (!user) throw ApiError.notFound('User not found')

    const { tempPassword, inviteSent, inviteWarning } = await reissueInvite(user)
    res.json({
        id: String(user._id),
        ...(inviteSent ? { ok: true } : { ok: true, inviteWarning, tempPassword }),
    })
})

// PATCH /api/users/:id/status   (admin: anyone; member: only accounts within their scope)  Body: { status }
// Activate / deactivate any account; cascades to the profile status.
export const setUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body
    if (!['active', 'inactive', 'pending'].includes(status)) throw ApiError.badRequest('Invalid status')

    const user = await User.findById(req.params.id)
    if (!user) throw ApiError.notFound('User not found')

    if (req.user.role === 'member') {
        const scope = (await memberScopeUserIds(req.member._id)).map(String)
        if (!scope.includes(String(user._id))) throw ApiError.forbidden('That account is outside your scope')
    }

    user.status = status
    await user.save()

    if (user.role === 'member') await Member.updateOne({ user: user._id }, { status })
    if (user.role === 'trainer') await Trainer.updateOne({ user: user._id }, { status })
    if (user.role === 'client') await Client.updateOne({ user: user._id }, { status })

    res.json({ id: String(user._id), status: user.status })
})
