import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, App, Result } from 'antd'
import { ClockCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import LoadingSkeleton from '../components/feedback/LoadingSkeleton'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

// Step 5 of Member self-signup: awaiting (or rejected from) Admin review.
// Approval happens out-of-band (an admin reviewing elsewhere), so this page
// can't push-update itself — "Check status" re-pulls /auth/me, which is what
// actually flips AppRoutes over to the real dashboard once approved.
export default function PendingApproval() {
    const { message, modal } = App.useApp()
    const navigate = useNavigate()
    const { logout, refreshUser } = useAuth()
    const [payment, setPayment] = useState(null)
    const [loading, setLoading] = useState(true)
    const [checking, setChecking] = useState(false)

    const load = () => {
        api.get('/member-payments/me')
            .then((res) => setPayment(res.items?.[0] || null))
            .catch(() => message.error('Failed to load your payment status'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [])

    // If approval already happened, refreshUser() flips the context's `user`
    // and AppRoutes immediately redirects away from this page on its own —
    // no navigation call needed here. Otherwise just re-pull the payment status.
    const checkStatus = async () => {
        setChecking(true)
        try {
            await refreshUser()
            load()
        } catch {
            message.error('Could not check your status right now')
        } finally {
            setChecking(false)
        }
    }

    if (loading) return <LoadingSkeleton />

    const rejected = payment?.status === 'rejected'

    return (
        <div className="mx-auto max-w-lg p-6 sm:p-10">
            <Result
                icon={<ClockCircleOutlined style={{ color: rejected ? 'var(--color-danger)' : 'var(--color-warning, #d97706)' }} />}
                status={rejected ? 'error' : 'info'}
                title={rejected ? 'Payment was not approved' : 'Your account is pending approval'}
                subTitle={
                    rejected
                        ? (payment?.rejectionReason || 'Your payment proof could not be verified. Please submit a new one.')
                        : "We've received your payment proof — an admin will review it shortly. You'll get full access as soon as it's approved."
                }
            />

            {payment && (
                <div className="app-card p-5">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-text-muted">Plan</div>
                        <div className="text-right font-semibold text-text-primary">{payment.planName}</div>
                        <div className="text-text-muted">Amount</div>
                        <div className="text-right font-semibold text-text-primary">{money(payment.amount, payment.currency)}</div>
                        <div className="text-text-muted">Submitted</div>
                        <div className="text-right font-semibold text-text-primary">{fmtDate(payment.submittedAt)}</div>
                    </div>
                    {payment.screenshotUrl && (
                        <img src={payment.screenshotUrl} alt="Payment proof" className="mt-4 max-h-56 w-full rounded-lg object-contain" style={{ border: '1px solid var(--color-border)' }} />
                    )}
                </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-2">
                {rejected ? (
                    <Button type="primary" size="large" block onClick={() => navigate('/submit-payment')}>
                        Submit a new payment
                    </Button>
                ) : (
                    <Button size="large" block icon={<ReloadOutlined />} loading={checking} onClick={checkStatus}>
                        Check status
                    </Button>
                )}
                <Button type="link" onClick={() => modal.confirm({ title: 'Log out?', onOk: logout })}>
                    Log out
                </Button>
            </div>
        </div>
    )
}
