// Member subscription status is derived (there is no stored field): no plan -> 'no_plan',
// account not active -> 'inactive', then by planExpiryDate. `subscriptionFilter`
// is the same rule as a Mongo query so list pages can filter on it server-side.
// Shared by the Members / Payments pages and the admin dashboard so they always agree.
import { MemberPayment, SubscriptionPlan, Trainer, Client } from '../models/index.js'

// A free plan (final price 0) can be taken once per payer. A pending or approved
// free MemberPayment uses it up; a rejected one doesn't. `payerKey` is 'member' | 'trainer'.
export const FREE_PLAN_USED_MESSAGE = 'The free plan can only be used once — please choose a paid plan'
export async function hasUsedFreePlan(payerKey, payerId) {
    return !!(await MemberPayment.exists({ [payerKey]: payerId, isFree: true, status: { $ne: 'rejected' } }))
}

export const EXPIRING_DAYS = 7
export const DAY_MS = 86_400_000

// Every subscription period is a fixed 30 days (not a calendar month), counted
// from the approval date on a first payment / plan change and from the renewal
// date on an admin renewal. This is what planExpiryDate is set to.
export const PLAN_PERIOD_DAYS = 30
export const addPlanPeriod = (date) => new Date(new Date(date).getTime() + PLAN_PERIOD_DAYS * DAY_MS)

export function subscriptionStatus(member, now = new Date()) {
    if (!member.plan) return 'no_plan'
    if (member.status !== 'active') return 'inactive'
    if (!member.planExpiryDate) return 'active'
    const expiry = new Date(member.planExpiryDate)
    if (expiry < now) return 'expired'
    if (expiry <= new Date(now.getTime() + EXPIRING_DAYS * DAY_MS)) return 'expiring'
    return 'active'
}

// The paid period the payer is in right now, plus the approved payment that opened it.
async function currentPeriod(payerKey, payer) {
    const last = await MemberPayment.findOne(
        { [payerKey]: payer._id, status: 'approved' },
        'source submittedAt reviewedAt amount planPrice isFree',
    ).sort({ createdAt: -1 }).lean()
    const endDate = payer.planExpiryDate || null
    let startDate = last ? (last.source === 'admin_renewal' ? last.submittedAt : last.reviewedAt) : null
    if (!startDate && endDate) {
        startDate = new Date(new Date(endDate).getTime() - PLAN_PERIOD_DAYS * DAY_MS)
    }
    return { last, startDate, endDate }
}

// Mid-period plan change: the unused part of the current period is credited
// against the new plan's price — value of the current period x time left / period
// length, rounded to a whole currency unit. The period's value is the full plan
// price it was bought at (planPrice; `amount` on payments that predate it, where
// the two are equal). Free periods, lapsed periods and plans with no expiry or no
// payment behind them carry no credit.
export async function unusedCredit(payerKey, payer, now = new Date()) {
    const { last, startDate, endDate } = await currentPeriod(payerKey, payer)
    if (!last || last.isFree || !startDate || !endDate) return 0
    const total = new Date(endDate) - new Date(startDate)
    const left = new Date(endDate) - now
    if (total <= 0 || left <= 0) return 0
    const value = last.planPrice ?? last.amount
    return Math.round(value * Math.min(1, left / total))
}

// Why a payer can't move onto `plan` because of what they already manage (null = fine).
// Members are held to both seat limits across their team; trainers to the client cap.
export async function planCapacityBlock(payerKey, payerId, plan) {
    if (payerKey === 'trainer') {
        const clients = await Client.countDocuments({ trainer: payerId })
        return clients > plan.maxClients ? `You have ${clients} clients — this plan allows ${plan.maxClients}` : null
    }
    const trainerIds = await Trainer.find({ managedBy: payerId }).distinct('_id')
    if (trainerIds.length > plan.maxTrainers) return `You have ${trainerIds.length} trainers — this plan allows ${plan.maxTrainers}`
    const clients = await Client.countDocuments({ trainer: { $in: trainerIds } })
    return clients > plan.maxClients ? `You have ${clients} clients — this plan allows ${plan.maxClients}` : null
}

// The payer's current subscription period for their own dashboard: plan name,
// start / end dates, days remaining and derived status. There is no stored start
// date — it is the date the latest approved payment took effect (approval date
// for a self-submitted payment, the renewal date for an admin-recorded one),
// i.e. the date planExpiryDate was counted from. Null when they have no plan.
export async function subscriptionSummary(payerKey, payer, now = new Date()) {
    if (!payer?.plan) return null
    const [plan, { startDate, endDate }] = await Promise.all([
        payer.plan.name ? payer.plan : SubscriptionPlan.findById(payer.plan, 'name').lean(),
        currentPeriod(payerKey, payer),
    ])
    return {
        plan: plan?.name || null,
        startDate,
        endDate,
        planExpiryDate: endDate,
        daysLeft: endDate ? Math.ceil((new Date(endDate) - now) / DAY_MS) : null,
        status: subscriptionStatus(payer, now),
    }
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
