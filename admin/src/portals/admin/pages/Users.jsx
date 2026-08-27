import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Tag, App } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    UserSwitchOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import { confirmDelete } from '../../../utils/confirm'
import { users as seedUsers } from '../../../services/mockData'

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
                                { key: 'assign', icon: <UserSwitchOutlined />, label: 'Assign trainer' },
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
                                else if (key === 'toggle') toggleStatus(r)
                                else if (key === 'delete') remove(r)
                                else message.info(`${key} — ${r.name}`)
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
                <Button type="primary">Add user</Button>
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
        </div>
    )
}
