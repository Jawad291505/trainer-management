// Member subscription status is derived (there is no stored field): no plan -> 'no_plan',
// account not active -> 'inactive', then by planExpiryDate. `subscriptionFilter`
// is the same rule as a Mongo query so list pages can filter on it server-side.
// Shared by the Members / Payments pages and the admin dashboard so they always agree.
export const EXPIRING_DAYS = 7
export const DAY_MS = 86_400_000

export function subscriptionStatus(member, now = new Date()) {
    if (!member.plan) return 'no_plan'
    if (member.status !== 'active') return 'inactive'
    if (!member.planExpiryDate) return 'active'
    const expiry = new Date(member.planExpiryDate)
    if (expiry < now) return 'expired'
    if (expiry <= new Date(now.getTime() + EXPIRING_DAYS * DAY_MS)) return 'expiring'
    return 'active'
}

export function subscriptionFilter(status, now = new Date()) {
    const soon = new Date(now.getTime() + EXPIRING_DAYS * DAY_MS)
    const paying = { plan: { $ne: null }, status: 'active' }
    switch (status) {
        case 'no_plan': return { plan: null }
        case 'inactive': return { plan: { $ne: null }, status: { $ne: 'active' } }
        case 'expired': return { ...paying, planExpiryDate: { $lt: now } }
        case 'expiring': return { ...paying, planExpiryDate: { $gte: now, $lte: soon } }
        case 'active': return { ...paying, $or: [{ planExpiryDate: null }, { planExpiryDate: { $gt: soon } }] }
        default: return {}
    }
}
