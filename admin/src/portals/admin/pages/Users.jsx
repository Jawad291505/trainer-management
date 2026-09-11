import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Tag, App, Modal, Form, Input } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
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

const ROLE_TAG = {
    'Super Admin': 'var(--color-primary)',
    Trainer: 'var(--color-info)',
    Client: 'var(--color-success)',
}

export default function Users() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [role, setRole] = useState('all')
    const [status, setStatus] = useState('all')

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users')
            setData(res.items || [])
        } catch (err) {
            message.error('Failed to load users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchUsers() }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((u) => {
            const matchQ = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
            const matchR = role === 'all' || u.role === role
            const matchS = status === 'all' || u.status === status
            return matchQ && matchR && matchS
        })
    }, [data, search, role, status])

    const toggleStatus = async (record) => {
        const next = record.status === 'active' ? 'inactive' : 'active'
        try {
            await api.patch(`/users/${record.id}/status`, { status: next })
            setData((prev) => prev.map((u) => (u.id === record.id ? { ...u, status: next } : u)))
            message.success(`${record.name} ${next === 'active' ? 'activated' : 'deactivated'}`)
        } catch (err) {
            message.error(err.message)
        }
    }

    const viewProfile = (record) => {
        if (record.roleKey === 'trainer') navigate(`/trainers/${record.id}`)
        else if (record.roleKey === 'client') navigate(`/clients/${record.id}`)
        else message.info('No detail page for this role')
    }

    const fmtDate = (d) => {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-CA')
    }

    const columns = [
        {
            title: 'User',
            dataIndex: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            render: (_, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => viewProfile(r)}>
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
        { title: 'Assigned Trainer', dataIndex: 'trainerName', width: 170, render: (t) => <span className="text-text-secondary">{t || '—'}</span> },
        { title: 'Join Date', dataIndex: 'joinDate', width: 130, sorter: (a, b) => String(a.joinDate).localeCompare(String(b.joinDate)), render: (d) => <span className="text-text-secondary">{fmtDate(d)}</span> },
        { title: 'Last Activity', dataIndex: 'lastActivity', width: 140, render: (d) => <span className="text-text-muted">{fmtDate(d)}</span> },
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
                                { type: 'divider' },
                                {
                                    key: 'toggle',
                                    icon: isActive ? <StopOutlined /> : <CheckCircleOutlined />,
                                    label: isActive ? 'Deactivate' : 'Activate',
                                },
                            ],
                            onClick: ({ key }) => {
                                if (key === 'view') viewProfile(r)
                                else if (key === 'toggle') toggleStatus(r)
                            },
                        }}
                    >
                        <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                )
            },
        },
    ]

    if (loading) return <LoadingSkeleton />

    return (
        <div>
            <PageHeader title="User Management" subtitle={`${filtered.length} users found`} />

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
