import { useCallback, useEffect, useMemo, useState } from 'react'
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
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import ClientCard from '../components/ClientCard'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const CLIENT_GOALS = ['Fat Loss', 'Muscle Gain', 'Body Recomposition', 'PCOS', 'Busy Moms', 'Diabetic Patients']
const PROGRAMME_PLANS = ['Starter', 'Standard', 'Premium', 'Elite']

export default function Clients() {
    const navigate = useNavigate()
    const { message } = App.useApp()
    const { trainer, refreshUser } = useAuth()
    // Only independent (outsourced) trainers own their client list; everyone else's clients are assigned to them.
    const canAddClients = trainer?.affiliation === 'outsourced'
    const [addOpen, setAddOpen] = useState(false)
    const [addSaving, setAddSaving] = useState(false)
    const [addForm] = Form.useForm()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [view, setView] = useState('table')

    const load = useCallback(() => {
        setLoading(true)
        setLoadError(null)
        api.get('/clients').then((res) => setData(res.items || [])).catch(setLoadError).finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    const createClient = async () => {
        const v = await addForm.validateFields()
        setAddSaving(true)
        try {
            const created = await api.post('/clients', {
                name: v.name,
                email: v.email,
                goal: v.goal,
                plan: v.plan,
                startWeight: v.weight,
                weight: v.weight,
                target: v.targetWeight,
            })
            setAddOpen(false)
            load()
            refreshUser() // keeps the capacity check on the Add button current
            if (created.inviteWarning) {
                message.warning(`${v.name} added, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
            } else {
                message.success(`${v.name} added — an invite email was sent to ${v.email}`)
            }
        } catch (err) {
            message.error(err.message)
        } finally {
            setAddSaving(false)
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((c) => {
            const matchQ = !q || c.name?.toLowerCase().includes(q) || c.goal?.toLowerCase().includes(q)
            const matchS = status === 'all' || c.status === status
            return matchQ && matchS
        })
    }, [data, search, status])

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '—'

    const columns = [
        {
            title: 'Client', dataIndex: 'name', sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
            render: (_, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/clients/${r.id}`)}>
                    <UserAvatar name={r.name} color={r.avatarColor} size={38} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{r.name}</span>
                            {r.progress < 45 && r.status === 'active' && <WarningFilled style={{ color: 'var(--color-warning)', fontSize: 12 }} />}
                        </div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Goal', dataIndex: 'goal', width: 140, render: (g) => <span className="text-text-secondary">{g}</span> },
        { title: 'Plan', dataIndex: 'plan', width: 110, render: (p) => <span className="font-medium text-text-primary">{p}</span> },
        { title: 'Progress', dataIndex: 'progress', width: 160, sorter: (a, b) => (a.progress || 0) - (b.progress || 0), render: (p) => <Progress percent={p || 0} size="small" strokeColor="var(--color-primary)" /> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Joined', dataIndex: 'joinDate', width: 120, render: (d) => <span className="text-text-muted">{fmtDate(d)}</span> },
        {
            title: '', key: 'actions', width: 60, fixed: 'right',
            render: (_, r) => (
                <Dropdown trigger={['click']} menu={{
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
                }}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    if (loading) return <LoadingSkeleton />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load your clients" error={loadError} onRetry={load} /></div>

    return (
        <div>
            <PageHeader title="My Clients" subtitle={`${filtered.length} clients ${canAddClients ? 'on your roster' : 'assigned to you'}`}>
                {canAddClients && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled={trainer.clientCount >= trainer.capacity}
                        onClick={() => { addForm.resetFields(); setAddOpen(true) }}
                    >
                        Add client
                    </Button>
                )}
            </PageHeader>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />
                <Select value={status} onChange={setStatus} style={{ width: 150 }} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
                <div className="sm:ml-auto hidden sm:block">
                    <Segmented value={view} onChange={setView} options={[{ value: 'table', icon: <UnorderedListOutlined /> }, { value: 'grid', icon: <AppstoreOutlined /> }]} />
                </div>
            </FilterBar>
            {filtered.length === 0 ? (
                <div className="app-card"><EmptyState title="No clients found" description="Try adjusting your search or filters." /></div>
            ) : (
                <>
                    <div className="hidden sm:block">
                        {view === 'table' ? (
                            <DataTable columns={columns} dataSource={filtered} pageSize={8} scrollX={900} />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((c) => <ClientCard key={c.id} client={c} />)}</div>
                        )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:hidden">{filtered.map((c) => <ClientCard key={c.id} client={c} />)}</div>
                </>
            )}

            <Modal title="Add client" open={addOpen} onCancel={() => setAddOpen(false)} onOk={createClient} okText="Add client" confirmLoading={addSaving} width={560} centered>
                <Form form={addForm} layout="vertical" className="mt-4" initialValues={{ plan: 'Standard', goal: 'Fat Loss' }}>
                    <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}><Input placeholder="e.g. Jordan Blake" /></Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}><Input placeholder="jordan.blake@gmail.com" /></Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="weight" label="Weight (kg)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="82" /></Form.Item>
                        <Form.Item name="targetWeight" label="Target (kg)"><InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="75" /></Form.Item>
                        <Form.Item name="goal" label="Goal" rules={[{ required: true }]}><Select options={CLIENT_GOALS.map((g) => ({ value: g, label: g }))} /></Form.Item>
                        <Form.Item name="plan" label="Programme" rules={[{ required: true }]}><Select options={PROGRAMME_PLANS.map((p) => ({ value: p, label: p }))} /></Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
