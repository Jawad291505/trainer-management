import { useEffect, useState } from 'react'
import { Modal, Button, App, Upload, Skeleton, Tag } from 'antd'
import { InboxOutlined, SwapOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import ModalTitle from './ModalTitle'
import SectionError from '../feedback/SectionError'
import { api } from '../../services/api'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`

const BANK_LABEL = {
    bankName: 'Bank',
    accountTitle: 'Account title',
    accountNumber: 'Account number',
    iban: 'IBAN',
    branch: 'Branch',
}

// Mid-period plan change for an active subscriber. The backend (GET /plan-change)
// prices every plan: the unused days of the current period are credited against
// the new plan, the rest is paid by bank transfer with a screenshot, and an admin
// approves it like any other payment. The new plan and a fresh 30-day period start on
// approval — until then nothing changes.
export default function ChangePlanModal({ open, onClose, showTrainerSeats = false }) {
    const { message } = App.useApp()
    const [quote, setQuote] = useState(null)
    const [bank, setBank] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [picked, setPicked] = useState(null)
    const [file, setFile] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    const load = () => {
        setLoading(true)
        setError(null)
        Promise.all([api.get('/plan-change', { force: true }), api.get('/organization/bank-details')])
            .then(([q, b]) => { setQuote(q); setBank(b) })
            .catch(setError)
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        if (!open) return
        setPicked(null)
        setFile(null)
        load()
    }, [open])

    const submit = async () => {
        if (picked.amountDue > 0 && !file) {
            message.error('Upload a screenshot of your payment first')
            return
        }
        setSubmitting(true)
        try {
            if (picked.amountDue > 0) {
                const formData = new FormData()
                formData.append('planId', picked.id)
                formData.append('screenshot', file)
                await api.upload('/plan-change', formData)
            } else {
                await api.post('/plan-change', { planId: picked.id })
            }
            message.success('Plan change requested — awaiting approval.')
            onClose()
        } catch (err) {
            message.error(err.message || 'Could not submit your request')
        } finally {
            setSubmitting(false)
        }
    }

    const pending = quote?.pending
    const limits = (p) => `Up to ${p.maxClients} clients${showTrainerSeats ? ` · ${p.maxTrainers} trainers` : ''}`

    let body
    if (loading) body = <Skeleton active paragraph={{ rows: 5 }} />
    else if (error) body = <SectionError title="Couldn't load plans" error={error} onRetry={load} />
    else if (pending) {
        body = (
            <div className="rounded-lg p-4 text-sm text-text-secondary" style={{ background: 'var(--color-surface-secondary)' }}>
                Your request to move to the <strong className="text-text-primary">{pending.planName}</strong> plan
                {pending.amount > 0 ? ` (${money(pending.amount, pending.currency)} paid)` : ''} is awaiting admin approval.
                Your current plan stays active until then.
            </div>
        )
    } else if (picked) {
        body = (
            <div>
                <Button type="link" icon={<ArrowLeftOutlined />} className="mb-2 px-0" onClick={() => { setPicked(null); setFile(null) }}>Back to plans</Button>
                <div className="rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="font-bold text-text-primary">{picked.name}</div>
                    <div className="text-xs text-text-muted">{limits(picked)}</div>
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <div className="text-text-muted">Plan price</div>
                        <div className="text-right font-semibold text-text-primary">{money(picked.finalPrice, picked.currency)}</div>
                        <div className="text-text-muted">Credit for unused days</div>
                        <div className="text-right font-semibold text-text-primary">− {money(picked.credit, picked.currency)}</div>
                        <div className="font-bold text-text-primary">To pay now</div>
                        <div className="text-right text-base font-extrabold text-text-primary">{money(picked.amountDue, picked.currency)}</div>
                    </div>
                </div>
                <p className="mt-3 mb-0 text-xs text-text-muted">
                    Once an admin approves, the new plan applies immediately and a new 30-day period starts from the approval date. Unused credit is not refunded.
                </p>

                {picked.amountDue > 0 && (
                    <>
                        <div className="mt-4 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="mb-2 text-sm font-bold text-text-primary">Bank details</div>
                            {bank?.configured ? (
                                <table className="w-full text-sm">
                                    <tbody>
                                        {Object.entries(BANK_LABEL).map(([key, label]) => bank[key] && (
                                            <tr key={key}>
                                                <td className="py-1 pr-4 text-text-muted">{label}</td>
                                                <td className="py-1 font-semibold text-text-primary">{bank[key]}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-sm text-text-muted">Payment details haven&apos;t been configured yet — please contact your administrator.</div>
                            )}
                        </div>
                        <div className="mt-4">
                            <Upload.Dragger
                                accept="image/*"
                                maxCount={1}
                                beforeUpload={(f) => { setFile(f); return false }}
                                onRemove={() => setFile(null)}
                                fileList={file ? [file] : []}
                            >
                                <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                                <p className="ant-upload-text">Click or drag your payment screenshot</p>
                                <p className="ant-upload-hint text-xs text-text-muted">PNG or JPG, up to 5MB</p>
                            </Upload.Dragger>
                        </div>
                    </>
                )}

                <Button type="primary" size="large" block className="mt-5" loading={submitting} onClick={submit}>
                    Request plan change
                </Button>
            </div>
        )
    } else {
        body = (
            <div className="flex flex-col gap-3">
                {quote.credit > 0 && (
                    <div className="text-xs text-text-muted">
                        You have {money(quote.credit, quote.options[0]?.currency || '')} credit for the unused days of your current plan.
                    </div>
                )}
                {quote.options.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border p-4" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 font-bold text-text-primary">
                                {p.name}
                                {p.isCurrent && <Tag color="blue" style={{ borderRadius: 999, margin: 0 }}>Current</Tag>}
                            </div>
                            <div className="text-xs text-text-muted">{money(p.finalPrice, p.currency)}/mo · {limits(p)}</div>
                            {p.blockedReason && !p.isCurrent && <div className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>{p.blockedReason}</div>}
                        </div>
                        {!p.isCurrent && (
                            <div className="shrink-0 text-right">
                                {!p.blockedReason && <div className="mb-1 text-xs text-text-muted">Pay {money(p.amountDue, p.currency)}</div>}
                                <Button type="primary" size="small" disabled={!!p.blockedReason} onClick={() => setPicked(p)}>Select</Button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    return (
        <Modal
            title={<ModalTitle icon={<SwapOutlined />} title="Change plan" subtitle="Switch at any time — unused days are credited" />}
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            width={520}
            destroyOnClose
        >
            <div className="mt-4">{body}</div>
        </Modal>
    )
}
