import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, App, Modal, Form, Input, InputNumber, Dropdown, Tag } from 'antd'
import { PlusOutlined, MoreOutlined, EyeOutlined, EditOutlined, StopOutlined, CheckCircleOutlined, DeleteOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'

const ONBOARDING_LABEL = {
    verify_email: { text: 'Verifying email', color: 'blue' },
    select_plan: { text: 'Choosing plan', color: 'blue' },
    submit_payment: { text: 'Awaiting payment', color: 'gold' },
    awaiting_approval: { text: 'Awaiting approval', color: 'gold' },
    rejected: { text: 'Payment rejected', color: 'red' },
}

// Admin's primary People view: manage Members, each scoped to their own
// Trainers -> Clients (drills into MemberDetail). Replaces a flat Trainer list
// as the top-level management screen; /trainers still exists for direct links.
export default function Members() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()

    const fetchMembers = async () => {
        try {
            const res = await api.get('/members')
            setData(res.items || [])
        } catch (err) {
            message.error('Failed to load members')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchMembers() }, [])

    const openCreate = () => {
        setEditing('new')
        form.setFieldsValue({ name: '', email: '', title: 'Member', status: 'active', trainerLimit: 5 })
    }
    const openEdit = (member) => {
        setEditing(member)
        form.setFieldsValue({
            name: member.name, email: member.email, title: member.title,
            status: member.status, trainerLimit: member.trainerLimit,
        })
    }

    const saveMember = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (editing === 'new') {
                const created = await api.post('/members', v)
                setData((prev) => [created, ...prev])
                if (created.inviteWarning) {
                    message.warning(`${v.name} created, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
                } else {
                    message.success(`${v.name} created — an invite email was sent to ${v.email}`)
                }
            } else {
                const updated = await api.patch(`/members/${editing.id}`, v)
                setData((prev) => prev.map((m) => (m.id === editing.id ? updated : m)))
                message.success('Member updated')
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
        return data.filter((m) => {
            const matchQ = !q || m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
            const matchS = status === 'all' || m.status === status
            return matchQ && matchS
        })
    }, [data, search, status])

    const handleAction = async (key, member) => {
        switch (key) {
            case 'view':
                navigate(`/members/${member.id}`)
                break
            case 'edit':
                openEdit(member)
                break
            case 'toggle': {
                const next = member.status === 'active' ? 'inactive' : 'active'
                try {
                    const res = await api.patch(`/members/${member.id}`, { status: next })
                    setData((prev) => prev.map((m) => (m.id === member.id ? res : m)))
                    message.success(`${member.name} ${next === 'active' ? 'activated' : 'deactivated'}`)
                } catch (err) { message.error(err.message) }
                break
            }
            case 'delete':
                confirmDelete({
                    title: 'Delete member?',
                    content: `This will remove ${member.name}. Their trainers will fall back to being managed directly by Admin.`,
                    okText: 'Delete member',
                    onOk: async () => {
                        try {
                            await api.delete(`/members/${member.id}`)
                            setData((prev) => prev.filter((m) => m.id !== member.id))
                            message.success('Member deleted')
                        } catch (err) { message.error(err.message) }
                    },
                })
                break
            default:
                break
        }
    }

    if (loading) return <LoadingSkeleton />

    return (
        <div>
            <PageHeader title="Member Management" subtitle={`${filtered.length} members on the platform`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Create member
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search members…" />
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
                    <EmptyState title="No members found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((m) => (
                        <div key={m.id} className="app-card app-card-hover animate-rise flex flex-col p-5">
                            <div className="flex items-start justify-between">
                                <button className="flex items-center gap-3 text-left" onClick={() => handleAction('view', m)}>
                                    <UserAvatar name={m.name} color={m.avatarColor} size={48} />
                                    <div>
                                        <div className="font-bold text-text-primary transition-colors hover:text-primary">{m.name}</div>
                                        <div className="text-xs text-text-muted">{m.title}</div>
                                    </div>
                                </button>
                                <Dropdown
                                    trigger={['click']}
                                    menu={{
                                        items: [
                                            { key: 'view', icon: <EyeOutlined />, label: 'View details' },
                                            { key: 'edit', icon: <EditOutlined />, label: 'Edit member' },
                                            { type: 'divider' },
                                            {
                                                key: 'toggle',
                                                icon: m.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />,
                                                label: m.status === 'active' ? 'Deactivate' : 'Activate',
                                            },
                                            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                                        ],
                                        onClick: ({ key }) => handleAction(key, m),
                                    }}
                                >
                                    <Button type="text" icon={<MoreOutlined />} />
                                </Dropdown>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={m.status} />
                                {m.onboardingStage && ONBOARDING_LABEL[m.onboardingStage] && (
                                    <Tag color={ONBOARDING_LABEL[m.onboardingStage].color} style={{ borderRadius: 999 }}>
                                        {ONBOARDING_LABEL[m.onboardingStage].text}
                                    </Tag>
                                )}
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
                                <div>
                                    <div className={`text-base font-extrabold ${m.trainerCount >= m.trainerLimit ? 'text-danger' : 'text-text-primary'}`} style={m.trainerCount >= m.trainerLimit ? { color: 'var(--color-danger)' } : undefined}>
                                        {m.trainerCount}/{m.trainerLimit}
                                    </div>
                                    <div className="text-[11px] text-text-muted">Trainers (limit)</div>
                                </div>
                                <div>
                                    <div className="text-base font-extrabold text-text-primary">{m.clientCount}</div>
                                    <div className="text-[11px] text-text-muted">Clients</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title={editing === 'new' ? 'Create member' : 'Edit member'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveMember}
                okText={editing === 'new' ? 'Create' : 'Save changes'}
                confirmLoading={saving}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Priya Sharma" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="priya.sharma@fittrack.io" />
                    </Form.Item>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
                        <Input placeholder="e.g. Regional Manager" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item
                            name="trainerLimit"
                            label="Max trainers"
                            rules={[
                                { required: true, message: 'Set a trainer limit' },
                                editing && editing !== 'new'
                                    ? {
                                        validator: (_, value) => (value == null || value <= editing.clientLimit
                                            ? Promise.resolve()
                                            : Promise.reject(new Error(`Cannot exceed this member's client limit (${editing.clientLimit})`))),
                                    }
                                    : {},
                            ]}
                            tooltip={editing && editing !== 'new'
                                ? `Maximum trainers this member may have assigned at once — capped at their client limit (${editing.clientLimit}).`
                                : 'Maximum trainers this member may have assigned at once.'}
                        >
                            <InputNumber min={0} max={editing && editing !== 'new' ? editing.clientLimit : 500} style={{ width: '100%' }} />
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
