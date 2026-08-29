import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, App, Modal, Form, Input, InputNumber } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import TrainerCard from '../components/TrainerCard'
import { confirmDelete } from '../../../utils/confirm'
import { trainers as seed } from '../../../services/mockData'

export default function Trainers() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [editing, setEditing] = useState(null) // trainer record, or 'new', or null
    const [form] = Form.useForm()

    const AVATAR_COLORS = ['#0b2545', '#7c3aed', '#047857', '#be123c', '#b45309', '#0f766e', '#2563eb']

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
        if (editing === 'new') {
            setData((prev) => [
                {
                    id: `TR-${Date.now()}`,
                    name: v.name,
                    email: v.email,
                    specialization: v.specialization,
                    status: v.status,
                    capacity: v.capacity,
                    clients: 0,
                    joinDate: new Date().toISOString().slice(0, 10),
                    rating: 0,
                    revenue: 0,
                    avatarColor: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
                },
                ...prev,
            ])
            message.success(`${v.name} created`)
        } else {
            setData((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...v } : t)))
            message.success('Trainer updated')
        }
        setEditing(null)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((t) => {
            const matchQ = !q || t.name.toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q)
            const matchS = status === 'all' || t.status === status
            return matchQ && matchS
        })
    }, [data, search, status])

    const update = (id, patch) => setData((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

    const handleAction = (key, trainer) => {
        switch (key) {
            case 'view':
                navigate(`/trainers/${trainer.id}`)
                break
            case 'edit':
                openEdit(trainer)
                break
            case 'increase':
                update(trainer.id, { capacity: trainer.capacity + 1 })
                message.success(`Capacity increased to ${trainer.capacity + 1}`)
                break
            case 'decrease':
                if (trainer.capacity <= trainer.clients) {
                    message.warning('Capacity cannot be below current client count')
                } else {
                    update(trainer.id, { capacity: trainer.capacity - 1 })
                    message.success(`Capacity decreased to ${trainer.capacity - 1}`)
                }
                break
            case 'toggle':
                update(trainer.id, { status: trainer.status === 'active' ? 'inactive' : 'active' })
                message.success(`${trainer.name} ${trainer.status === 'active' ? 'deactivated' : 'activated'}`)
                break
            case 'delete':
                confirmDelete({
                    title: 'Delete trainer?',
                    content: `This will remove ${trainer.name} and unassign their clients.`,
                    okText: 'Delete trainer',
                    onOk: () => {
                        setData((prev) => prev.filter((t) => t.id !== trainer.id))
                        message.success('Trainer deleted')
                    },
                })
                break
            default:
                message.info(`${key} — ${trainer.name}`)
        }
    }

    return (
        <div>
            <PageHeader title="Trainer Management" subtitle={`${filtered.length} trainers on the platform`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Create trainer
                </Button>
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
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No trainers found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((t) => (
                        <TrainerCard key={t.id} trainer={t} onAction={handleAction} />
                    ))}
                </div>
            )}

            <Modal
                title={editing === 'new' ? 'Create trainer' : 'Edit trainer'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveTrainer}
                okText={editing === 'new' ? 'Create' : 'Save changes'}
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
