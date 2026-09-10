import { asyncHandler } from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { User, Trainer, Client } from '../models/index.js'

// GET /api/users?role=&status=&search=   (admin)
// The unified Users table (admin/src/portals/admin/pages/Users.jsx): admins +
// trainers + clients in one list, each row carrying its assigned trainer name.
export const listUsers = asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.role) filter.role = req.query.role
    if (req.query.status) filter.status = req.query.status
    if (req.query.search) {
        const rx = { $regex: String(req.query.search).trim(), $options: 'i' }
        filter.$or = [{ name: rx }, { email: rx }]
    }

    const users = await User.find(filter).sort({ createdAt: -1 })

    // Resolve assigned-trainer name for client rows in one pass.
    const clients = await Client.find({ user: { $in: users.filter((u) => u.role === 'client').map((u) => u._id) } })
        .populate({ path: 'trainer', populate: { path: 'user', select: 'name' } })
    const trainerNameByUser = new Map(clients.map((c) => [String(c.user), c.trainer?.user?.name || '—']))

    res.json({
        count: users.length,
        items: users.map((u) => ({
            id: String(u._id),
            name: u.name,
            email: u.email,
            role: u.role === 'admin' ? 'Super Admin' : u.role === 'trainer' ? 'Trainer' : 'Client',
            roleKey: u.role,
            status: u.status,
            avatarColor: u.avatarColor,
            trainerName: u.role === 'client' ? trainerNameByUser.get(String(u._id)) || '—' : '—',
            joinDate: u.joinDate,
            lastActivity: u.lastActivity,
        })),
    })
})

// PATCH /api/users/:id/status   (admin)  Body: { status }
// Activate / deactivate any account; cascades to the profile status.
export const setUserStatus = asyncHandler(async (req, res) => {
    const { status } = req.body
    if (!['active', 'inactive', 'pending'].includes(status)) throw ApiError.badRequest('Invalid status')

    const user = await User.findById(req.params.id)
    if (!user) throw ApiError.notFound('User not found')
    user.status = status
    await user.save()

    if (user.role === 'trainer') await Trainer.updateOne({ user: user._id }, { status })
    if (user.role === 'client') await Client.updateOne({ user: user._id }, { status })

    res.json({ id: String(user._id), status: user.status })
})
