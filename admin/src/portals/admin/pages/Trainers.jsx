import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, App, Modal, Form, Input, InputNumber, Tooltip, Radio } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import TrainerCard from '../components/TrainerCard'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

export default function Trainers() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user } = useAuth()
    const isMember = user?.role === 'member'
    const [memberStats, setMemberStats] = useState(null)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [type, setType] = useState('all')
    const list = usePagedList('/trainers', { params: { status, type }, search, pageSize: 12 })
    const { items: data, total, loading, error: loadError, setItems: setData, reload: fetchTrainers } = list
    const [editing, setEditing] = useState(null)
    const [memberOptions, setMemberOptions] = useState([])
    const [renewing, setRenewing] = useState(null)
    const [trainerPlans, setTrainerPlans] = useState([])
    const [renewForm] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()
    const wAffiliation = Form.useWatch('affiliation', form)

    useEffect(() => {
        if (isMember) api.get('/stats/member').then(setMemberStats).catch(() => { })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const atLimit = isMember && memberStats && memberStats.totalTrainers >= memberStats.trainerLimit

    // Admin picks up front where a new trainer sits: in-house for one of the members
    // (needs that member) or fully outsourced (independent, own plans + clients).
    const openCreate = () => {
        setEditing('new')
        form.resetFields()
        form.setFieldsValue({ name: '', email: '', specialization: '', capacity: 20, status: 'active', affiliation: isMember ? 'member' : undefined, memberId: undefined })
        if (!isMember && memberOptions.length === 0) {
            api.get('/members', { ttl: 30_000 })
                .then((res) => setMemberOptions((res.items || []).map((m) => ({ value: m.id, label: m.name }))))
                .catch(() => message.warning("Couldn't load the member list"))
        }
    }
    const openEdit = (trainer) => {
        setEditing(trainer)
        form.setFieldsValue({
            name: trainer.name,
            email: trainer.email,
            specialization: trainer.specialization,
            capacity: trainer.capacity,
            status: trainer.status,
        })
    }

    const saveTrainer = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (editing === 'new') {
                const created = await api.post('/trainers', isMember ? { ...v, affiliation: undefined } : v)
                list.setPage(1)
                fetchTrainers()
                if (isMember) setMemberStats((prev) => (prev ? { ...prev, totalTrainers: prev.totalTrainers + 1 } : prev))
                if (created.inviteWarning) {
                    message.warning(`${v.name} created, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
                } else {
                    message.success(`${v.name} created — an invite email was sent to ${v.email}`)
                }
            } else {
                const updated = await api.patch(`/trainers/${editing.id}`, v)
                setData((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
                if (status !== 'all' && updated.status !== status) fetchTrainers()
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
                try {
                    const res = await api.patch(`/trainers/${trainer.id}/capacity`, { delta: 1 })
                    setData((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
                    message.success(`Capacity increased to ${res.capacity}`)
                } catch (err) { message.error(err.message) }
                break
            case 'decrease':
                try {
                    const res = await api.patch(`/trainers/${trainer.id}/capacity`, { delta: -1 })
                    setData((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
                    message.success(`Capacity decreased to ${res.capacity}`)
                } catch (err) { message.error(err.message) }
                break
            case 'renew':
                setRenewing(trainer)
                renewForm.resetFields()
                if (trainerPlans.length === 0) {
                    api.get('/subscription-plans?audience=trainer')
                        .then((res) => setTrainerPlans(res.items || []))
                        .catch(() => message.warning("Couldn't load trainer plans"))
                }
                break
            case 'toggle': {
                const next = trainer.status === 'active' ? 'inactive' : 'active'
                try {
                    const res = await api.patch(`/trainers/${trainer.id}`, { status: next })
                    setData((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
                    if (status !== 'all') fetchTrainers()
                    message.success(`${trainer.name} ${next === 'active' ? 'activated' : 'deactivated'}`)
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
                            fetchTrainers()
                            if (isMember) setMemberStats((prev) => (prev ? { ...prev, totalTrainers: Math.max(0, prev.totalTrainers - 1) } : prev))
                            message.success('Trainer deleted')
                        } catch (err) { message.error(err.message) }
                    },
                })
                break
            default:
                message.info(`${key} — ${trainer.name}`)
        }
    }

    const submitRenewal = async () => {
        const v = await renewForm.validateFields()
        setSaving(true)
        try {
            await api.post(`/trainer-payments/${renewing.id}/renew`, { planId: v.planId, amount: v.amount })
            message.success(`${renewing.name}'s subscription was renewed`)
            setRenewing(null)
            fetchTrainers()
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <LoadingSkeleton />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load trainers" error={loadError} onRetry={fetchTrainers} /></div>

    return (
        <div>
            <PageHeader
                title="Trainer Management"
                subtitle={isMember && memberStats
                    ? `${memberStats.totalTrainers} / ${memberStats.trainerLimit} trainers assigned to you`
                    : `${total} trainers on the platform`}
            >
                <Tooltip title={atLimit ? `You've reached your trainer limit (${memberStats.trainerLimit}). Ask a Super Admin to raise it.` : ''}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={atLimit}>
                        Create trainer
                    </Button>
                </Tooltip>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search trainers…" />
                <Select
                    value={status}
                    onChange={setStatus}
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'All status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                />
                {!isMember && (
                    <Select
                        value={type}
                        onChange={setType}
                        style={{ width: 190 }}
                        options={[
                            { value: 'all', label: 'All trainer types' },
                            { value: 'admin', label: 'In-house' },
                            { value: 'member', label: 'For a member' },
                            { value: 'outsourced', label: 'Independent' },
                        ]}
                    />
                )}
            </FilterBar>

            {data.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No trainers found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.map((t) => (
                        <TrainerCard key={t.id} trainer={t} onAction={handleAction} showType={!isMember} showRevenue={!isMember} />
                    ))}
                </div>
            )}

            <Pager list={list} />

            <Modal
                title={editing === 'new' ? 'Create trainer' : 'Edit trainer'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveTrainer}
                okText={editing === 'new' ? 'Create' : 'Save changes'}
                confirmLoading={saving}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    {editing === 'new' && !isMember && (
                        <>
                            <Form.Item
                                name="affiliation"
                                label="Trainer type"
                                rules={[{ required: true, message: 'Choose one' }]}
                            >
                                <Radio.Group>
                                    <Radio.Button value="admin">In-house</Radio.Button>
                                    <Radio.Button value="member">For a member</Radio.Button>
                                    <Radio.Button value="outsourced">Independent</Radio.Button>
                                </Radio.Group>
                            </Form.Item>
                            {wAffiliation === 'member' && (
                                <Form.Item name="memberId" label="Member" rules={[{ required: true, message: 'Pick the member this trainer works for' }]}>
                                    <Select showSearch optionFilterProp="label" placeholder="Select a member" options={memberOptions} />
                                </Form.Item>
                            )}
                            {wAffiliation === 'outsourced' && (
                                <div className="mb-4 rounded-lg px-3 py-2 text-xs text-text-secondary" style={{ background: 'var(--color-surface-secondary)' }}>
                                    Independent trainers aren&apos;t tied to any member — they manage their own clients and can subscribe to a trainer plan from the trainer portal.
                                </div>
                            )}
                        </>
                    )}
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
                            <Select
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                ]}
                            />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={`Renew subscription — ${renewing?.name || ''}`}
                open={!!renewing}
                onCancel={() => setRenewing(null)}
                onOk={submitRenewal}
                okText="Record renewal"
                confirmLoading={saving}
                centered
            >
                <Form form={renewForm} layout="vertical" className="mt-4">
                    <Form.Item name="planId" label="Trainer plan" rules={[{ required: true, message: 'Pick a plan' }]}>
                        <Select
                            placeholder="Select a plan"
                            options={trainerPlans.map((p) => ({ value: p.id, label: `${p.name} — ${p.currency} ${Number(p.priceMonthly).toLocaleString()}/mo (${p.maxClients} clients)` }))}
                            onChange={(id) => renewForm.setFieldsValue({ amount: trainerPlans.find((p) => p.id === id)?.priceMonthly })}
                        />
                    </Form.Item>
                    <Form.Item name="amount" label="Amount received" rules={[{ required: true, message: 'Enter the amount' }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
