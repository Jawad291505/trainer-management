import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Tag, App, Modal, Form, Input } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    UserSwitchOutlined,
    PlusOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import { confirmDelete } from '../../../utils/confirm'
import { users as seedUsers, trainers } from '../../../services/mockData'

const ROLE_TAG = {
    'Super Admin': 'var(--color-primary)',
    Trainer: 'var(--color-info)',
    Client: 'var(--color-success)',
}

export default function Users() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seedUsers)
    const [search, setSearch] = useState('')
    const [role, setRole] = useState('all')
    const [status, setStatus] = useState('all')
    const [editing, setEditing] = useState(null) // record, 'new', or null
    const [assignFor, setAssignFor] = useState(null)
    const [form] = Form.useForm()
    const [assignForm] = Form.useForm()
    const editingRole = Form.useWatch('role', form)

    const openCreate = () => {
        setEditing('new')
        form.setFieldsValue({ name: '', email: '', role: 'Client', status: 'pending', trainerName: undefined })
    }
    const openEdit = (record) => {
        setEditing(record)
        form.setFieldsValue({
            name: record.name,
            email: record.email,
            role: record.role,
            status: record.status,
            trainerName: record.trainerName && record.trainerName !== '—' ? record.trainerName : undefined,
        })
    }
    const saveUser = async () => {
        const v = await form.validateFields()
        const trainerName = v.role === 'Client' ? v.trainerName || 'Unassigned' : '—'
        if (editing === 'new') {
            setData((prev) => [
                {
                    id: `${v.role === 'Trainer' ? 'TR' : v.role === 'Client' ? 'CL' : 'AD'}-${Date.now()}`,
                    name: v.name,
                    email: v.email,
                    role: v.role,
                    status: v.status,
                    trainerName,
                    joinDate: new Date().toISOString().slice(0, 10),
                    lastActivity: 'Just now',
                    avatarColor: '#2563eb',
                },
                ...prev,
            ])
            message.success(`${v.name} added`)
        } else {
            setData((prev) =>
                prev.map((u) => (u.id === editing.id ? { ...u, name: v.name, email: v.email, role: v.role, status: v.status, trainerName } : u)),
            )
            message.success('User updated')
        }
        setEditing(null)
    }

    const openAssign = (record) => {
        setAssignFor(record)
        assignForm.setFieldsValue({ trainerName: record.trainerName && record.trainerName !== '—' ? record.trainerName : undefined })
    }
    const submitAssign = async () => {
        const v = await assignForm.validateFields()
        setData((prev) => prev.map((u) => (u.id === assignFor.id ? { ...u, trainerName: v.trainerName } : u)))
        message.success(`${assignFor.name} assigned to ${v.trainerName}`)
        setAssignFor(null)
    }

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((u) => {
            const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            const matchR = role === 'all' || u.role === role
            const matchS = status === 'all' || u.status === status
            return matchQ && matchR && matchS
        })
    }, [data, search, role, status])

    const toggleStatus = (record) => {
        setData((prev) =>
            prev.map((u) => (u.id === record.id ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' } : u)),
        )
        message.success(`${record.name} ${record.status === 'active' ? 'deactivated' : 'activated'}`)
    }

    // Route to the matching detail page based on the user's role.
    const viewProfile = (record) => {
        if (record.role === 'Trainer') navigate(`/trainers/${record.id}`)
        else if (record.role === 'Client') navigate(`/clients/${record.id}`)
        else message.info('No detail page for this role')
    }

    const remove = (record) => {
        confirmDelete({
            title: 'Delete user?',
            content: `This will permanently remove ${record.name} from the platform.`,
            onOk: () => {
                setData((prev) => prev.filter((u) => u.id !== record.id))
                message.success('User deleted')
            },
        })
    }

    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <div
                    className="flex cursor-pointer items-center gap-3"
                    onClick={() => viewProfile(r)}
                >
                    <UserAvatar name={r.name} color={r.avatarColor} size={38} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{r.name}</div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            width: 140,
            filters: [
                { text: 'Super Admin', value: 'Super Admin' },
                { text: 'Trainer', value: 'Trainer' },
                { text: 'Client', value: 'Client' },
            ],
            onFilter: (v, r) => r.role === v,
            render: (role) => (
                <Tag style={{ borderRadius: 999, border: 'none', padding: '2px 10px', color: '#fff', background: ROLE_TAG[role] }}>
                    {role}
                </Tag>
            ),
        },
        { title: 'Status', dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s} /> },
        { title: 'Assigned Trainer', dataIndex: 'trainerName', width: 170, render: (t) => <span className="text-text-secondary">{t}</span> },
        { title: 'Join Date', dataIndex: 'joinDate', width: 130, sorter: (a, b) => a.joinDate.localeCompare(b.joinDate), render: (d) => <span className="text-text-secondary">{d}</span> },
        { title: 'Last Activity', dataIndex: 'lastActivity', width: 140, render: (d) => <span className="text-text-muted">{d}</span> },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, r) => {
                const isActive = r.status === 'active'
                return (
                    <Dropdown
                        trigger={['click']}
                        menu={{
                            items: [
                                { key: 'view', icon: <EyeOutlined />, label: 'View profile' },
                                { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
                                ...(r.role === 'Client'
                                    ? [{ key: 'assign', icon: <UserSwitchOutlined />, label: 'Assign trainer' }]
                                    : []),
                                { type: 'divider' },
                                {
                                    key: 'toggle',
                                    icon: isActive ? <StopOutlined /> : <CheckCircleOutlined />,
                                    label: isActive ? 'Deactivate' : 'Activate',
                                },
                                { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                            ],
                            onClick: ({ key }) => {
                                if (key === 'view') viewProfile(r)
                                else if (key === 'edit') openEdit(r)
                                else if (key === 'assign') openAssign(r)
                                else if (key === 'toggle') toggleStatus(r)
                                else if (key === 'delete') remove(r)
                            },
                        }}
                    >
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                )
            },
        },
    ]

    return (
        <div>
            <PageHeader title="User Management" subtitle={`${filtered.length} users found`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add user</Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
                <Select
                    value={role}
                    onChange={setRole}
                    style={{ width: 160 }}
                    options={[
                        { value: 'all', label: 'All roles' },
                        { value: 'Super Admin', label: 'Super Admin' },
                        { value: 'Trainer', label: 'Trainer' },
                        { value: 'Client', label: 'Client' },
                    ]}
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
                title={editing === 'new' ? 'Add user' : 'Edit user'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveUser}
                okText={editing === 'new' ? 'Add user' : 'Save changes'}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Jordan Blake" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="jordan.blake@fittrack.io" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { value: 'Super Admin', label: 'Super Admin' },
                                    { value: 'Trainer', label: 'Trainer' },
                                    { value: 'Client', label: 'Client' },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'pending', label: 'Pending' },
                                ]}
                            />
                        </Form.Item>
                    </div>
                    {editingRole === 'Client' && (
                        <Form.Item name="trainerName" label="Assigned trainer">
                            <Select
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                placeholder="Leave empty for unassigned"
                                options={trainers.map((t) => ({ value: t.name, label: t.name }))}
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            <Modal
                title={assignFor ? `Assign trainer to ${assignFor.name}` : 'Assign trainer'}
                open={!!assignFor}
                onCancel={() => setAssignFor(null)}
                onOk={submitAssign}
                okText="Assign"
                okButtonProps={{ icon: <UserSwitchOutlined /> }}
                centered
            >
                <Form form={assignForm} layout="vertical" className="mt-4">
                    <Form.Item name="trainerName" label="Trainer" rules={[{ required: true, message: 'Pick a trainer' }]}>
                        <Select
                            showSearch
                            optionFilterProp="label"
                            placeholder="Select a trainer"
                            options={trainers.map((t) => ({ value: t.name, label: `${t.name} — ${t.clients}/${t.capacity} clients` }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
