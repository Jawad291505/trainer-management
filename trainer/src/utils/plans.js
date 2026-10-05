// Subscription plan pricing. `priceMonthly` is the actual (list) price and
// `discountPercent` an optional 0-100 discount on it — mirrors planFinalPrice()
// in backend/src/models/SubscriptionPlan.js so every screen shows what the
// backend will charge.

export const planDiscount = (plan) => Math.min(100, Math.max(0, Number(plan?.discountPercent) || 0))

// Price after the discount, rounded to a whole currency unit.
export function planFinalPrice(plan) {
    return Math.round(((Number(plan?.priceMonthly) || 0) * (100 - planDiscount(plan))) / 100)
}
