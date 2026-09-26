import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, App } from 'antd'
import { CheckCircleFilled } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import LoadingSkeleton from '../components/feedback/LoadingSkeleton'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`

// Step 3 of Trainer (outsourced) self-signup: pick a subscription plan. Plans are entirely
// data-driven (Admin's Subscription Plans page) — nothing here is hardcoded.
export default function SelectPlan() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { refreshUser } = useAuth()
    const [plans, setPlans] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectingId, setSelectingId] = useState(null)

    useEffect(() => {
        api.get('/subscription-plans')
            .then((res) => setPlans(res.items || []))
            .catch(() => message.error('Failed to load plans'))
            .finally(() => setLoading(false))
    }, [])

    const selectPlan = async (plan) => {
        setSelectingId(plan.id)
        try {
            await api.post('/member-signup/select-plan', { planId: plan.id })
            await refreshUser()
            navigate('/submit-payment', { replace: true })
        } catch (err) {
            message.error(err.message || 'Could not select that plan')
        } finally {
            setSelectingId(null)
        }
    }

    if (loading) return <LoadingSkeleton />

    return (
        <div className="mx-auto max-w-4xl p-6 sm:p-10">
            <div className="text-center">
                <h2 className="text-2xl font-extrabold tracking-tight text-text-primary sm:text-3xl">Choose your plan</h2>
                <p className="mt-2 text-sm text-text-secondary">Pick the plan that matches how many clients you plan to coach. You can upgrade later.</p>
            </div>

            {plans.length === 0 ? (
                <div className="app-card mt-8 p-8 text-center text-text-muted">No plans are available right now — please check back shortly.</div>
            ) : (
                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {plans.map((plan) => (
                        <div key={plan.id} className="app-card flex flex-col p-6">
                            <div className="text-lg font-extrabold text-text-primary">{plan.name}</div>
                            {plan.description && <div className="mt-1 text-sm text-text-muted">{plan.description}</div>}
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-text-primary">{money(plan.priceMonthly, plan.currency)}</span>
                                <span className="text-sm text-text-muted">/ month</span>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                                <CheckCircleFilled style={{ color: 'var(--color-success)' }} />
                                Up to {plan.maxClients} clients
                            </div>
                            <Button
                                type="primary"
                                size="large"
                                block
                                className="mt-6"
                                loading={selectingId === plan.id}
                                disabled={!!selectingId && selectingId !== plan.id}
                                onClick={() => selectPlan(plan)}
                            >
                                Select plan
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
