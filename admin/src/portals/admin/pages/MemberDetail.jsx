import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Modal, Form, Input, InputNumber, Select, App, Tooltip, Tag } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, MailOutlined, CalendarOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import TrainerCard from '../components/TrainerCard'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-CA') : '—')
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : '—')
const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`

const ONBOARDING_LABEL = {
    verify_email: { text: 'Awaiting email verification', color: 'blue' },
    select_plan: { text: 'Choosing a plan', color: 'blue' },
    submit_payment: { text: 'Awaiting payment', color: 'gold' },
    awaiting_approval: { text: 'Awaiting payment approval', color: 'gold' },
    rejected: { text: 'Payment rejected', color: 'red' },
    approved: { text: 'Approved', color: 'green' },
}

// Admin drill-down from Member Management: this Member's own Trainers, and
// (via each TrainerCard -> TrainerDetail) their Clients. Mirrors the Trainers
// page's create/edit/capacity/delete actions, scoped to trainer.managedBy = this member.
export default function MemberDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { message } = App.useApp()
    const [member, setMember] = useState(null)
    const [trainers, setTrainers] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [rejecting, setRejecting] = useState(false)
    const [reason, setReason] = useState('')
    const [acting, setActing] = useState(false)
    const [form] = Form.useForm()

    const load = async () => {
        try {
            const [m, t, p] = await Promise.all([
                api.get(`/members/${id}`),
                api.get(`/trainers?member=${id}`),
                api.get(`/member-payments?member=${id}`),
            ])
            setMember(m)
            setTrainers(t.items || [])
            setPayments(p.items || [])
        } catch {
            // member not found
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])

    const latestPayment = payments[0]

    const approvePayment = async () => {
        setActing(true)
        try {
            await api.patch(`/member-payments/${latestPayment.id}/approve`, {})
            message.success(`${member.name} approved — their account is now active`)
            await load()
        } catch (err) {
            message.error(err.message)
        } finally {
            setActing(false)
        }
    }

    const rejectPayment = async () => {
        setActing(true)
        try {
            await api.patch(`/member-payments/${latestPayment.id}/reject`, { reason })
            message.success('Payment rejected')
            setRejecting(false)
            setReason('')
            await load()
        } catch (err) {
            message.error(err.message)
        } finally {
            setActing(false)
        }
    }

    const openCreate = () => {
        setEditing('new')
        form.setFieldsValue({ name: '', email: '', specialization: '', capacity: 20, status: 'active' })
    }
    const openEdit = (trainer) => {
        setEditing(trainer)
        form.setFieldsValue({
            name: trainer.name, email: trainer.email, specialization: trainer.specialization,
            capacity: trainer.capacity, status: trainer.status,
        })
    }

    const saveTrainer = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (editing === 'new') {
                const created = await api.post('/trainers', { ...v, memberId: id })
                setTrainers((prev) => [created, ...prev])
                setMember((prev) => (prev ? { ...prev, trainerCount: prev.trainerCount + 1 } : prev))
                if (created.inviteWarning) {
                    message.warning(`${v.name} created, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
                } else {
                    message.success(`${v.name} created — an invite email was sent to ${v.email}`)
                }
            } else {
                const updated = await api.patch(`/trainers/${editing.id}`, v)
                setTrainers((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
                message.success('Trainer updated')
            }
            setEditing(null)
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleAction = async (key, trainer) => {
        switch (key) {
            case 'view':
                navigate(`/trainers/${trainer.id}`)
                break
            case 'edit':
                openEdit(trainer)
                break
            case 'increase':
            case 'decrease':
                try {
                    const res = await api.patch(`/trainers/${trainer.id}/capacity`, { delta: key === 'increase' ? 1 : -1 })
                    setTrainers((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
                } catch (err) { message.error(err.message) }
                break
            case 'toggle': {
                const next = trainer.status === 'active' ? 'inactive' : 'active'
                try {
                    const res = await api.patch(`/trainers/${trainer.id}`, { status: next })
                    setTrainers((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
                } catch (err) { message.error(err.message) }
                break
            }
            case 'delete':
                confirmDelete({
                    title: 'Delete trainer?',
                    content: `This will remove ${trainer.name} and unassign their clients.`,
                    okText: 'Delete trainer',
                    onOk: async () => {
                        try {
                            await api.delete(`/trainers/${trainer.id}`)
                            setTrainers((prev) => prev.filter((t) => t.id !== trainer.id))
                            setMember((prev) => (prev ? { ...prev, trainerCount: Math.max(0, prev.trainerCount - 1) } : prev))
                            message.success('Trainer deleted')
                        } catch (err) { message.error(err.message) }
                    },
                })
                break
            default:
                break
        }
    }

    if (loading) return <LoadingSkeleton />

    if (!member) {
        return (
            <div className="app-card">
                <EmptyState
                    title="Member not found"
                    description="This member may have been removed."
                    action={<Button type="primary" onClick={() => navigate('/members')}>Back to members</Button>}
                />
            </div>
        )
    }

    const atLimit = member.trainerCount >= member.trainerLimit

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/members')} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>Back to members</Button>

            <div className="app-card mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={member.name} color={member.avatarColor} size={64} />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="m-0 text-xl font-extrabold text-text-primary md:text-2xl">{member.name}</h1>
                                <StatusBadge status={member.status} />
                            </div>
                            <div className="mt-1 text-sm text-text-muted">{member.title}</div>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-text-secondary">
                                <span className="flex items-center gap-1"><MailOutlined />{member.email}</span>
                                <span className="flex items-center gap-1"><CalendarOutlined />Joined {fmtDate(member.joinDate)}</span>
                            </div>
                        </div>
                    </div>
                    <Tooltip title={atLimit ? `Trainer limit reached (${member.trainerLimit}). Ask a Super Admin to raise it.` : ''}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={atLimit}>Add trainer</Button>
                    </Tooltip>
                </div>
            </div>

            {member.onboardingStage && (
                <div className="app-card mb-6 p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="section-title m-0">Subscription & payment</h3>
                        <Tag color={ONBOARDING_LABEL[member.onboardingStage]?.color} style={{ borderRadius: 999 }}>
                            {ONBOARDING_LABEL[member.onboardingStage]?.text || member.onboardingStage}
                        </Tag>
                    </div>
                    {member.plan && (
                        <div className="mb-3 text-sm text-text-secondary">
                            Active plan: <strong className="text-text-primary">{member.plan.name}</strong> — {money(member.plan.priceMonthly, member.plan.currency)}/mo, up to {member.plan.maxClients} clients
                        </div>
                    )}
                    {latestPayment ? (
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <img
                                src={latestPayment.screenshotUrl}
                                alt="Payment proof"
                                className="h-32 w-full rounded-lg object-cover sm:w-40"
                                style={{ border: '1px solid var(--color-border)' }}
                            />
                            <div className="flex-1 text-sm">
                                <div className="grid grid-cols-2 gap-1.5 sm:max-w-xs">
                                    <div className="text-text-muted">Plan submitted</div>
                                    <div className="text-right font-semibold text-text-primary">{latestPayment.planName}</div>
                                    <div className="text-text-muted">Amount</div>
                                    <div className="text-right font-semibold text-text-primary">{money(latestPayment.amount, latestPayment.currency)}</div>
                                    <div className="text-text-muted">Submitted</div>
                                    <div className="text-right font-semibold text-text-primary">{fmtDateTime(latestPayment.submittedAt)}</div>
                                    {latestPayment.rejectionReason && (
                                        <>
                                            <div className="text-text-muted">Reason</div>
                                            <div className="text-right font-semibold text-danger">{latestPayment.rejectionReason}</div>
                                        </>
                                    )}
                                </div>
                                {latestPayment.status === 'pending' && (
                                    <div className="mt-3 flex gap-2">
                                        <Button size="small" type="primary" icon={<CheckOutlined />} loading={acting} onClick={approvePayment}>Approve</Button>
                                        <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setRejecting(true); setReason('') }}>Reject</Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-text-muted">No payment has been submitted yet.</div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard label="Trainers" value={`${member.trainerCount} / ${member.trainerLimit}`} hint={atLimit ? 'Limit reached' : `${member.trainerLimit - member.trainerCount} slots left`} />
                <StatCard label="Clients" value={member.clientLimit ? `${member.clientCount} / ${member.clientLimit}` : member.clientCount} />
            </div>

            <h3 className="section-title mb-4 mt-6">Trainers under {member.name}</h3>
            {trainers.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No trainers assigned" description="Add a trainer to this member to get started." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {trainers.map((t) => (
                        <TrainerCard key={t.id} trainer={t} onAction={handleAction} />
                    ))}
                </div>
            )}

            <Modal
                title={editing === 'new' ? 'Add trainer' : 'Edit trainer'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveTrainer}
                okText={editing === 'new' ? 'Create' : 'Save changes'}
                confirmLoading={saving}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Marcus Bennett" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="marcus.bennett@fittrack.io" />
                    </Form.Item>
                    <Form.Item name="specialization" label="Specialization" rules={[{ required: true, message: 'Specialization is required' }]}>
                        <Input placeholder="e.g. Strength & Conditioning" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="capacity" label="Client capacity" rules={[{ required: true }]}>
                            <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Reject payment"
                open={rejecting}
                onCancel={() => setRejecting(false)}
                onOk={rejectPayment}
                okText="Reject payment"
                okButtonProps={{ danger: true, loading: acting }}
                centered
            >
                <p className="text-sm text-text-secondary">Let {member.name} know why (optional) — they&apos;ll see this and can resubmit.</p>
                <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Screenshot doesn't show the transaction amount" />
            </Modal>
        </div>
    )
}
