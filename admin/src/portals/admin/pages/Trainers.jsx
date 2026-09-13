import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, App, Modal, Form, Input, InputNumber, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import TrainerCard from '../components/TrainerCard'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

export default function Trainers() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user } = useAuth()
    const isMember = user?.role === 'member'
    const [data, setData] = useState([])
    const [memberStats, setMemberStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [type, setType] = useState('all')
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()

    const fetchTrainers = async () => {
        try {
            const [res, stats] = await Promise.all([
                api.get('/trainers'),
                isMember ? api.get('/stats/member') : Promise.resolve(null),
            ])
            setData(res.items || [])
            if (stats) setMemberStats(stats)
        } catch (err) {
            message.error('Failed to load trainers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchTrainers() }, [])

    const atLimit = isMember && memberStats && memberStats.totalTrainers >= memberStats.trainerLimit

    const openCreate = () => {
        setEditing('new')
        form.setFieldsValue({ name: '', email: '', specialization: '', capacity: 20, status: 'active' })
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
                const created = await api.post('/trainers', v)
                setData((prev) => [created, ...prev])
                if (isMember) setMemberStats((prev) => (prev ? { ...prev, totalTrainers: prev.totalTrainers + 1 } : prev))
                if (created.inviteWarning) {
                    message.warning(`${v.name} created, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
                } else {
                    message.success(`${v.name} created — an invite email was sent to ${v.email}`)
                }
            } else {
                const updated = await api.patch(`/trainers/${editing.id}`, v)
                setData((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
                message.success('Trainer updated')
            }
            setEditing(null)
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((t) => {
            const matchQ = !q || t.name?.toLowerCase().includes(q) || t.specialization?.toLowerCase().includes(q)
            const matchS = status === 'all' || t.status === status
            const matchT = type === 'all' || t.trainerType === type
            return matchQ && matchS && matchT
        })
    }, [data, search, status, type])

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
            case 'toggle': {
                const next = trainer.status === 'active' ? 'inactive' : 'active'
                try {
                    const res = await api.patch(`/trainers/${trainer.id}`, { status: next })
                    setData((prev) => prev.map((t) => (t.id === trainer.id ? res : t)))
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
                            setData((prev) => prev.filter((t) => t.id !== trainer.id))
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

    if (loading) return <LoadingSkeleton />

    return (
        <div>
            <PageHeader
                title="Trainer Management"
                subtitle={isMember && memberStats
                    ? `${memberStats.totalTrainers} / ${memberStats.trainerLimit} trainers assigned to you`
                    : `${filtered.length} trainers on the platform`}
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
                        style={{ width: 170 }}
                        options={[
                            { value: 'all', label: 'In-house & Third-party' },
                            { value: 'in-house', label: 'In-house only' },
                            { value: 'third-party', label: 'Third-party only' },
                        ]}
                    />
                )}
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No trainers found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((t) => (
                        <TrainerCard key={t.id} trainer={t} onAction={handleAction} showType={!isMember} />
                    ))}
                </div>
            )}

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
        </div>
    )
}
