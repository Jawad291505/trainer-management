import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Progress, App, Modal, Form, Input, InputNumber, DatePicker, Tooltip } from 'antd'
import dayjs from 'dayjs'
import {
    MoreOutlined,
    EyeOutlined,
    UserSwitchOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    PlusOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const CLIENT_GOALS = ['Fat Loss', 'Muscle Gain', 'Body Recomposition', 'PCOS', 'Busy Moms', 'Diabetic Patients']
const OTHER_GOAL = '__other__'

export default function Clients() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user } = useAuth()
    const isMember = user?.role === 'member'
    const [data, setData] = useState([])
    const [trainerList, setTrainerList] = useState([])
    const [memberStats, setMemberStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [trainerId, setTrainerId] = useState('all')
    const [addOpen, setAddOpen] = useState(false)
    const [addSaving, setAddSaving] = useState(false)
    const [reassignFor, setReassignFor] = useState(null)
    const [addForm] = Form.useForm()
    const [reassignForm] = Form.useForm()

    const wWeight = Form.useWatch('weight', addForm)
    const wHeight = Form.useWatch('height', addForm)
    const wGoal = Form.useWatch('goal', addForm)
    const bmi = wWeight && wHeight ? Number((wWeight / Math.pow(wHeight / 100, 2)).toFixed(1)) : null
    const bmiCategory = bmi == null ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
    const bmiColor = bmi == null ? 'var(--color-text-muted)' : bmi < 18.5 || bmi >= 30 ? 'var(--color-danger)' : bmi < 25 ? 'var(--color-success)' : 'var(--color-warning)'

    useEffect(() => {
        async function load() {
            try {
                const [c, t, stats] = await Promise.all([
                    api.get('/clients'),
                    api.get('/trainers'),
                    isMember ? api.get('/stats/member') : Promise.resolve(null),
                ])
                setData(c.items || [])
                setTrainerList(t.items || [])
                if (stats) setMemberStats(stats)
            } catch (err) {
                message.error('Failed to load data')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const atClientLimit = isMember && memberStats?.clientLimit > 0 && memberStats.totalClients >= memberStats.clientLimit

    const openAdd = () => {
        addForm.resetFields()
        addForm.setFieldsValue({ plan: 'Standard', goal: 'Fat Loss', planMonths: 3, startDate: dayjs() })
        setAddOpen(true)
    }

    const createClient = async () => {
        const v = await addForm.validateFields()
        setAddSaving(true)
        try {
            const goal = v.goal === OTHER_GOAL ? v.customGoal.trim() : v.goal
            const created = await api.post('/clients', {
                name: v.name,
                email: v.email,
                phone: v.phone,
                goal,
                plan: v.plan,
                startWeight: v.weight,
                weight: v.weight,
                target: v.targetWeight,
                trainerId: v.trainerId || null,
            })
            setData((prev) => [created, ...prev])
            setAddOpen(false)
            if (isMember) setMemberStats((prev) => (prev ? { ...prev, totalClients: prev.totalClients + 1 } : prev))
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

    const openReassign = (record) => {
        setReassignFor(record)
        reassignForm.setFieldsValue({ trainerId: record.trainerId || undefined })
    }

    const submitReassign = async () => {
        const v = await reassignForm.validateFields()
        try {
            const updated = await api.patch(`/clients/${reassignFor.id}/assign`, { trainerId: v.trainerId })
            setData((prev) => prev.map((c) => (c.id === reassignFor.id ? updated : c)))
            message.success(`${reassignFor.name} reassigned`)
            setReassignFor(null)
        } catch (err) {
            message.error(err.message)
        }
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((c) => {
            const matchQ = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
            const matchS = status === 'all' || c.status === status
            const matchT = trainerId === 'all' || c.trainerId === trainerId
            return matchQ && matchS && matchT
        })
    }, [data, search, status, trainerId])

    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '—'

    const columns = [
        {
            title: 'Client',
            dataIndex: 'name',
            sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
            render: (_, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/clients/${r.id}`)}>
                    <UserAvatar name={r.name} color={r.avatarColor} size={38} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{r.name}</div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Goal', dataIndex: 'goal', width: 140, render: (g) => <span className="text-text-secondary">{g}</span> },
        { title: 'Plan', dataIndex: 'plan', width: 110, render: (p) => <span className="font-medium text-text-primary">{p}</span> },
        { title: 'Trainer', dataIndex: 'trainerName', width: 160, render: (t) => <span className="text-text-secondary">{t || '—'}</span> },
        {
            title: 'Progress',
            dataIndex: 'progress',
            width: 150,
            sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
            render: (p) => (
                <Progress percent={p || 0} size="small" strokeColor="var(--color-primary)" format={(v) => <span className="text-xs font-semibold">{v}%</span>} />
            ),
        },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Join Date', dataIndex: 'joinDate', width: 130, render: (d) => <span className="text-text-muted">{fmtDate(d)}</span> },
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
                            { key: 'view', icon: <EyeOutlined />, label: 'View profile' },
                            { key: 'reassign', icon: <UserSwitchOutlined />, label: 'Reassign trainer' },
                            { type: 'divider' },
                            { key: 'toggle', icon: r.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />, label: r.status === 'active' ? 'Deactivate' : 'Activate' },
                            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                        ],
                        onClick: async ({ key }) => {
                            if (key === 'view') navigate(`/clients/${r.id}`)
                            else if (key === 'reassign') openReassign(r)
                            else if (key === 'toggle') {
                                const next = r.status === 'active' ? 'inactive' : 'active'
                                try {
                                    const updated = await api.patch(`/clients/${r.id}`, { status: next })
                                    setData((prev) => prev.map((c) => (c.id === r.id ? updated : c)))
                                    message.success('Status updated')
                                } catch (err) { message.error(err.message) }
                            }
                            else if (key === 'delete') {
                                confirmDelete({
                                    title: 'Delete client?',
                                    content: `This will permanently remove ${r.name}.`,
                                    onOk: async () => {
                                        try {
                                            await api.delete(`/clients/${r.id}`)
                                            setData((prev) => prev.filter((c) => c.id !== r.id))
                                            message.success('Client deleted')
                                        } catch (err) { message.error(err.message) }
                                    },
                                })
                            }
                        },
                    }}
                >
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    if (loading) return <LoadingSkeleton />

    return (
        <div>
            <PageHeader
                title="Client Management"
                subtitle={isMember && memberStats
                    ? `${memberStats.totalClients} / ${memberStats.clientLimit || 0} clients used on your plan`
                    : `${filtered.length} clients found`}
            >
                <Tooltip title={atClientLimit ? `Your plan allows up to ${memberStats.clientLimit} clients. Upgrade your plan to add more.` : ''}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} disabled={atClientLimit}>Add client</Button>
                </Tooltip>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />
                <Select value={trainerId} onChange={setTrainerId} style={{ width: 190 }} options={[{ value: 'all', label: 'All trainers' }, ...trainerList.map((t) => ({ value: t.id, label: t.name }))]} />
                <Select value={status} onChange={setStatus} style={{ width: 150 }} options={[{ value: 'all', label: 'All status' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'pending', label: 'Pending' }]} />
            </FilterBar>

            <DataTable columns={columns} dataSource={filtered} pageSize={9} scrollX={1050} />

            <Modal title="Add client" open={addOpen} onCancel={() => setAddOpen(false)} onOk={createClient} okText="Add client" confirmLoading={addSaving} width={640} centered>
                <Form form={addForm} layout="vertical" className="mt-4" initialValues={{ plan: 'Standard', goal: 'Fat Loss', planMonths: 3 }}>
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Contact</div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}><Input placeholder="e.g. Jordan Blake" /></Form.Item>
                        <Form.Item name="phone" label="Phone"><Input placeholder="+1 (555) 000-0000" /></Form.Item>
                    </div>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}><Input placeholder="jordan.blake@gmail.com" /></Form.Item>
                    <div className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-text-muted">Body metrics</div>
                    <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                        <Form.Item name="weight" label="Weight (kg)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="82" /></Form.Item>
                        <Form.Item name="height" label="Height (cm)" rules={[{ required: true, message: 'Required' }]}><InputNumber min={90} max={250} style={{ width: '100%' }} placeholder="178" /></Form.Item>
                        <Form.Item name="targetWeight" label="Target (kg)"><InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="75" /></Form.Item>
                    </div>
                    <div className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                        <span className="font-semibold text-text-secondary">BMI</span>
                        <span className="font-bold" style={{ color: bmiColor }}>{bmi == null ? 'Enter weight & height' : `${bmi} · ${bmiCategory}`}</span>
                    </div>
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Programme</div>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="goal" label="Goal" rules={[{ required: true }]}>
                            <Select options={[...CLIENT_GOALS.map((g) => ({ value: g, label: g })), { value: OTHER_GOAL, label: 'Other…' }]} />
                        </Form.Item>
                        <Form.Item name="plan" label="Plan" rules={[{ required: true }]}>
                            <Select options={['Starter', 'Standard', 'Premium', 'Elite'].map((p) => ({ value: p, label: p }))} />
                        </Form.Item>
                        {wGoal === OTHER_GOAL && <Form.Item name="customGoal" label="Custom goal" rules={[{ required: true, message: 'Enter a goal name' }]}><Input placeholder="e.g. Marathon Prep" /></Form.Item>}
                    </div>
                    <Form.Item
                        name="trainerId"
                        label="Assign trainer"
                        rules={isMember ? [{ required: true, message: 'Pick a trainer — required so you can find and manage this client later' }] : []}
                    >
                        <Select
                            allowClear={!isMember}
                            showSearch
                            optionFilterProp="label"
                            placeholder={isMember ? 'Select a trainer' : 'Leave empty for unassigned'}
                            options={trainerList.map((t) => ({ value: t.id, label: `${t.name} — ${t.clients}/${t.capacity} clients` }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={reassignFor ? `Reassign ${reassignFor.name}` : 'Reassign trainer'} open={!!reassignFor} onCancel={() => setReassignFor(null)} onOk={submitReassign} okText="Reassign" okButtonProps={{ icon: <UserSwitchOutlined /> }} centered>
                <Form form={reassignForm} layout="vertical" className="mt-4">
                    <Form.Item name="trainerId" label="Trainer" rules={[{ required: true, message: 'Pick a trainer' }]}>
                        <Select showSearch optionFilterProp="label" placeholder="Select a trainer" options={trainerList.map((t) => ({ value: t.id, label: `${t.name} — ${t.clients}/${t.capacity} clients` }))} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
