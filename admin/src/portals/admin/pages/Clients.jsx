import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Progress, App, Modal, Form, Input, InputNumber, DatePicker } from 'antd'
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
import { confirmDelete } from '../../../utils/confirm'
import { clients as seed, trainers, clientGoals } from '../../../services/mockData'

const OTHER_GOAL = '__other__'

export default function Clients() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [trainerId, setTrainerId] = useState('all')
    const [addOpen, setAddOpen] = useState(false)
    const [reassignFor, setReassignFor] = useState(null)
    const [addForm] = Form.useForm()
    const [reassignForm] = Form.useForm()

    // Live BMI from the weight/height fields in the Add-client form.
    const wWeight = Form.useWatch('weight', addForm)
    const wHeight = Form.useWatch('height', addForm)
    const wGoal = Form.useWatch('goal', addForm)
    const bmi = wWeight && wHeight ? Number((wWeight / Math.pow(wHeight / 100, 2)).toFixed(1)) : null
    const bmiCategory =
        bmi == null ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'
    const bmiColor =
        bmi == null
            ? 'var(--color-text-muted)'
            : bmi < 18.5 || bmi >= 30
                ? 'var(--color-danger)'
                : bmi < 25
                    ? 'var(--color-success)'
                    : 'var(--color-warning)'

    const openAdd = () => {
        addForm.resetFields()
        addForm.setFieldsValue({ startDate: dayjs(), planMonths: 3 })
        setAddOpen(true)
    }

    const createClient = async () => {
        const v = await addForm.validateFields()
        const trainer = trainers.find((t) => t.id === v.trainerId)
        const startDate = (v.startDate || dayjs()).format('YYYY-MM-DD')
        const endDate = (v.startDate || dayjs()).add(v.planMonths, 'month').format('YYYY-MM-DD')
        const goal = v.goal === OTHER_GOAL ? v.customGoal.trim() : v.goal
        setData((prev) => [
            {
                id: `CL-${Date.now()}`,
                name: v.name,
                email: v.email,
                phone: v.phone || '',
                role: 'Client',
                goal,
                plan: v.plan,
                planMonths: v.planMonths,
                startDate,
                endDate,
                weight: v.weight ?? null,
                height: v.height ?? null,
                bmi,
                targetWeight: v.targetWeight ?? null,
                status: 'pending',
                trainerId: trainer?.id || null,
                trainerName: trainer?.name || 'Unassigned',
                progress: 0,
                joinDate: startDate,
                lastActivity: 'Just now',
                avatarColor: '#2563eb',
            },
            ...prev,
        ])
        setAddOpen(false)
        message.success(`${v.name} added`)
    }

    const openReassign = (record) => {
        setReassignFor(record)
        reassignForm.setFieldsValue({ trainerId: record.trainerId || undefined })
    }

    const submitReassign = async () => {
        const v = await reassignForm.validateFields()
        const trainer = trainers.find((t) => t.id === v.trainerId)
        setData((prev) =>
            prev.map((c) =>
                c.id === reassignFor.id ? { ...c, trainerId: trainer.id, trainerName: trainer.name } : c,
            ),
        )
        message.success(`${reassignFor.name} reassigned to ${trainer.name}`)
        setReassignFor(null)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((c) => {
            const matchQ = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
            const matchS = status === 'all' || c.status === status
            const matchT = trainerId === 'all' || c.trainerId === trainerId
            return matchQ && matchS && matchT
        })
    }, [data, search, status, trainerId])

    const remove = (record) =>
        confirmDelete({
            title: 'Delete client?',
            content: `This will permanently remove ${record.name}.`,
            onOk: () => {
                setData((prev) => prev.filter((c) => c.id !== record.id))
                message.success('Client deleted')
            },
        })

    const columns = [
        {
            title: 'Client',
            dataIndex: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={() => navigate(`/clients/${r.id}`)}
                >
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
        { title: 'Trainer', dataIndex: 'trainerName', width: 160, render: (t) => <span className="text-text-secondary">{t}</span> },
        {
            title: 'Progress',
            dataIndex: 'progress',
            width: 150,
            sorter: (a, b) => a.progress - b.progress,
            render: (p) => (
                <Progress
                    percent={p}
                    size="small"
                    strokeColor="var(--color-primary)"
                    format={(v) => <span className="text-xs font-semibold">{v}%</span>}
                />
            ),
        },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Last Activity', dataIndex: 'lastActivity', width: 130, render: (d) => <span className="text-text-muted">{d}</span> },
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
                            {
                                key: 'toggle',
                                icon: r.status === 'active' ? <StopOutlined /> : <CheckCircleOutlined />,
                                label: r.status === 'active' ? 'Deactivate' : 'Activate',
                            },
                            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                        ],
                        onClick: ({ key }) => {
                            if (key === 'view') navigate(`/clients/${r.id}`)
                            else if (key === 'reassign') openReassign(r)
                            else if (key === 'delete') remove(r)
                            else if (key === 'toggle') {
                                setData((prev) =>
                                    prev.map((c) => (c.id === r.id ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' } : c)),
                                )
                                message.success('Status updated')
                            } else message.info(`${key} — ${r.name}`)
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
            <PageHeader title="Client Management" subtitle={`${filtered.length} clients found`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add client</Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />
                <Select
                    value={trainerId}
                    onChange={setTrainerId}
                    style={{ width: 190 }}
                    options={[{ value: 'all', label: 'All trainers' }, ...trainers.map((t) => ({ value: t.id, label: t.name }))]}
                />
                <Select
                    value={status}
                    onChange={setStatus}
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'All status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                        { value: 'pending', label: 'Pending' },
                    ]}
                />
            </FilterBar>

            <DataTable columns={columns} dataSource={filtered} pageSize={9} scrollX={1050} />

            <Modal
                title="Add client"
                open={addOpen}
                onCancel={() => setAddOpen(false)}
                onOk={createClient}
                okText="Add client"
                width={640}
                centered
            >
                <Form
                    form={addForm}
                    layout="vertical"
                    className="mt-4"
                    initialValues={{ plan: 'Standard', goal: 'Fat Loss', planMonths: 3 }}
                >
                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Contact</div>
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

                    <div className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-text-muted">Body metrics</div>
                    <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                        <Form.Item name="weight" label="Weight (kg)" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="82" />
                        </Form.Item>
                        <Form.Item name="height" label="Height (cm)" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={90} max={250} style={{ width: '100%' }} placeholder="178" />
                        </Form.Item>
                        <Form.Item name="targetWeight" label="Target (kg)">
                            <InputNumber min={20} max={400} style={{ width: '100%' }} placeholder="75" />
                        </Form.Item>
                    </div>
                    <div
                        className="mb-4 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
                        style={{ background: 'var(--color-surface-secondary)' }}
                    >
                        <span className="font-semibold text-text-secondary">Body Mass Index (BMI)</span>
                        <span className="font-bold" style={{ color: bmiColor }}>
                            {bmi == null ? 'Enter weight & height' : `${bmi} · ${bmiCategory}`}
                        </span>
                    </div>

                    <div className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">Programme</div>
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
                        <Form.Item name="planMonths" label="Plan duration" rules={[{ required: true, message: 'Pick a duration' }]}>
                            <Select
                                options={[1, 2, 3, 6, 9, 12].map((m) => ({ value: m, label: `${m} month${m > 1 ? 's' : ''}` }))}
                            />
                        </Form.Item>
                        <Form.Item name="startDate" label="Start date" rules={[{ required: true, message: 'Pick a start date' }]}>
                            <DatePicker className="w-full" format="YYYY-MM-DD" />
                        </Form.Item>
                    </div>
                    <Form.Item name="trainerId" label="Assign trainer">
                        <Select
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="Leave empty for unassigned"
                            options={trainers.map((t) => ({ value: t.id, label: `${t.name} — ${t.clients}/${t.capacity} clients` }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={reassignFor ? `Reassign ${reassignFor.name}` : 'Reassign trainer'}
                open={!!reassignFor}
                onCancel={() => setReassignFor(null)}
                onOk={submitReassign}
                okText="Reassign"
                okButtonProps={{ icon: <UserSwitchOutlined /> }}
                centered
            >
                <Form form={reassignForm} layout="vertical" className="mt-4">
                    <Form.Item name="trainerId" label="Trainer" rules={[{ required: true, message: 'Pick a trainer' }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Select a trainer"
                            options={trainers.map((t) => ({ value: t.id, label: `${t.name} — ${t.clients}/${t.capacity} clients` }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
