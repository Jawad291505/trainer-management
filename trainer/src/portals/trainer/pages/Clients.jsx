import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Segmented, Progress, Dropdown, Button, App, Modal, Form, Input, InputNumber } from 'antd'
import {
    AppstoreOutlined,
    UnorderedListOutlined,
    MoreOutlined,
    EyeOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    WarningFilled,
    PlusOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import EmptyState from '../../../components/common/EmptyState'
import ClientCard from '../components/ClientCard'
import { clients as seed, clientGoals, currentTrainer } from '../../../services/mockData'

const OTHER_GOAL = '__other__'
const AVATAR_COLORS = ['#0b2545', '#7c3aed', '#047857', '#be123c', '#b45309', '#0f766e', '#2563eb']

export default function Clients() {
    const navigate = useNavigate()
    const { message } = App.useApp()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [view, setView] = useState('table')
    const [addOpen, setAddOpen] = useState(false)
    const [form] = Form.useForm()
    const wGoal = Form.useWatch('goal', form)

    const openAdd = () => {
        form.resetFields()
        form.setFieldsValue({ goal: 'Fat Loss', plan: 'Standard' })
        setAddOpen(true)
    }

    const createClient = async () => {
        const v = await form.validateFields()
        const goal = v.goal === OTHER_GOAL ? v.customGoal.trim() : v.goal
        setData((prev) => [
            {
                id: `CL-${Date.now()}`,
                name: v.name.trim(),
                email: v.email,
                phone: v.phone || '',
                goal,
                plan: v.plan,
                progress: 0,
                weight: v.weight ?? null,
                target: v.target ?? null,
                followUp: 7,
                attention: false,
                status: 'active',
                avatarColor: AVATAR_COLORS[prev.length % AVATAR_COLORS.length],
                trainerName: currentTrainer.name,
                lastFollowUp: '—',
                nextFollowUp: 'Not scheduled',
                joinDate: new Date().toISOString().slice(0, 10),
            },
            ...prev,
        ])
        setAddOpen(false)
        message.success(`${v.name.trim()} added to your clients`)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((c) => {
            const matchQ = !q || c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q)
            const matchS = status === 'all' || c.status === status
            return matchQ && matchS
        })
    }, [data, search, status])

    const columns = [
        {
            title: 'Client',
            dataIndex: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/clients/${r.id}`)}>
                    <UserAvatar name={r.name} color={r.avatarColor} size={38} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{r.name}</span>
                            {r.attention && <WarningFilled style={{ color: 'var(--color-warning)', fontSize: 12 }} />}
                        </div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Goal', dataIndex: 'goal', width: 140, render: (g) => <span className="text-text-secondary">{g}</span> },
        { title: 'Plan', dataIndex: 'plan', width: 110, render: (p) => <span className="font-medium text-text-primary">{p}</span> },
        {
            title: 'Progress',
            dataIndex: 'progress',
            width: 160,
            sorter: (a, b) => a.progress - b.progress,
            render: (p) => <Progress percent={p} size="small" strokeColor="var(--color-primary)" />,
        },
        { title: 'Next Follow-up', dataIndex: 'nextFollowUp', width: 140, render: (d) => <span className="text-text-secondary">{d}</span> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, r) => (
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            { key: 'view', icon: <EyeOutlined />, label: 'View client' },
                            { key: 'diet', icon: <AppleOutlined />, label: 'Diet plan' },
                            { key: 'exercise', icon: <ThunderboltOutlined />, label: 'Exercise plan' },
                            { key: 'chat', icon: <MessageOutlined />, label: 'Message' },
                        ],
                        onClick: ({ key }) => {
                            if (key === 'chat') navigate('/messages')
                            else if (key === 'diet') navigate('/diet-plans')
                            else if (key === 'exercise') navigate('/exercise-plans')
                            else navigate(`/clients/${r.id}`)
                        },
                    }}
                >
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="My Clients" subtitle={`${filtered.length} clients assigned to you`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add client</Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />
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
                <div className="sm:ml-auto hidden sm:block">
                    <Segmented
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'table', icon: <UnorderedListOutlined /> },
                            { value: 'grid', icon: <AppstoreOutlined /> },
                        ]}
                    />
                </div>
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No clients found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <>
                    {/* Desktop: switchable table/grid. Mobile: always cards. */}
                    <div className="hidden sm:block">
                        {view === 'table' ? (
                            <DataTable columns={columns} dataSource={filtered} pageSize={8} scrollX={900} />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {filtered.map((c) => (
                                    <ClientCard key={c.id} client={c} />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:hidden">
                        {filtered.map((c) => (
                            <ClientCard key={c.id} client={c} />
                        ))}
                    </div>
                </>
            )}

            <Modal
                title="Add client"
                open={addOpen}
                onCancel={() => setAddOpen(false)}
                onOk={createClient}
                okText="Add client"
                width={560}
                centered
            >
                <p className="mb-3 text-sm text-text-secondary">
                    New clients are assigned to you ({currentTrainer.name}) automatically.
                </p>
                <Form form={form} layout="vertical">
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
                            <Input placeholder="e.g. Jordan Blake" />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone">
                            <Input placeholder="+1 (555) 000-0000" />
                        </Form.Item>
                    </div>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="jordan.blake@gmail.com" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="goal" label="Goal" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    ...clientGoals.map((g) => ({ value: g, label: g })),
                                    { value: OTHER_GOAL, label: 'Other…' },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
                            <Select options={['Starter', 'Standard', 'Premium', 'Elite'].map((p) => ({ value: p, label: p }))} />
                        </Form.Item>
                        {wGoal === OTHER_GOAL && (
                            <Form.Item
                                name="customGoal"
                                label="Custom goal name"
                                rules={[{ required: true, message: 'Enter a goal name' }]}
                            >
                                <Input placeholder="e.g. Marathon Prep" />
                            </Form.Item>
                        )}
                        <Form.Item name="weight" label="Weight (kg)">
                            <InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="82" />
                        </Form.Item>
                        <Form.Item name="target" label="Target weight (kg)">
                            <InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="75" />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
