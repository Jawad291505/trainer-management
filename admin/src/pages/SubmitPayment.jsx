import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, App, Upload } from 'antd'
import { InboxOutlined, BankOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import LoadingSkeleton from '../components/feedback/LoadingSkeleton'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`

const FIELD_LABEL = {
    bankName: 'Bank',
    accountTitle: 'Account title',
    accountNumber: 'Account number',
    iban: 'IBAN',
    branch: 'Branch',
}

// Step 4 of Member self-signup: pay externally via the bank details shown here,
// then upload proof. The plan being paid for is whatever Member.pendingPlan is
// server-side (set by SelectPlan) — never trusted from the client.
export default function SubmitPayment() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user, refreshUser } = useAuth()
    const plan = user?.member?.pendingPlan
    const [bank, setBank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [file, setFile] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        api.get('/organization/bank-details')
            .then(setBank)
            .catch(() => message.error('Failed to load payment details'))
            .finally(() => setLoading(false))
    }, [])

    const submit = async () => {
        if (!file) {
            message.error('Upload a screenshot of your payment first')
            return
        }
        setSubmitting(true)
        try {
            const formData = new FormData()
            formData.append('screenshot', file)
            await api.upload('/member-payments', formData)
            await refreshUser()
            message.success('Payment submitted — awaiting approval.')
            navigate('/pending-approval', { replace: true })
        } catch (err) {
            message.error(err.message || 'Could not submit your payment')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) return <LoadingSkeleton />

    return (
        <div className="mx-auto max-w-xl p-6 sm:p-10">
            <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Submit your payment</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
                Pay for your plan using the bank details below, then upload a screenshot as proof.
            </p>

            {plan && (
                <div className="app-card mt-6 flex items-center justify-between p-5">
                    <div>
                        <div className="font-bold text-text-primary">{plan.name}</div>
                        <div className="text-xs text-text-muted">Up to {plan.maxClients} clients</div>
                    </div>
                    <div className="text-xl font-extrabold text-text-primary">{money(plan.priceMonthly, plan.currency)}<span className="text-xs font-medium text-text-muted">/mo</span></div>
                </div>
            )}

            <div className="app-card mt-4 p-5">
                <div className="mb-3 flex items-center gap-2 font-bold text-text-primary">
                    <BankOutlined /> Bank details
                </div>
                {bank?.configured ? (
                    <table className="w-full text-sm">
                        <tbody>
                            {Object.entries(FIELD_LABEL).map(([key, label]) => bank[key] && (
                                <tr key={key}>
                                    <td className="py-1.5 pr-4 text-text-muted">{label}</td>
                                    <td className="py-1.5 font-semibold text-text-primary">{bank[key]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-sm text-text-muted">Payment details haven&apos;t been configured yet — please contact your administrator.</div>
                )}
            </div>

            <div className="app-card mt-4 p-5">
                <div className="mb-3 font-bold text-text-primary">Upload proof of payment</div>
                <Upload.Dragger
                    accept="image/*"
                    maxCount={1}
                    beforeUpload={(f) => { setFile(f); return false }}
                    onRemove={() => setFile(null)}
                    fileList={file ? [file] : []}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Click or drag a screenshot to upload</p>
                    <p className="ant-upload-hint text-xs text-text-muted">PNG or JPG, up to 5MB</p>
                </Upload.Dragger>
            </div>

            <Button type="primary" size="large" block className="mt-6" loading={submitting} onClick={submit}>
                Submit for approval
            </Button>
        </div>
    )
}
