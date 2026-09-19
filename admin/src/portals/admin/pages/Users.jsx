import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Tag, App, Modal, Form, Input } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    StopOutlined,
    CheckCircleOutlined,
    MailOutlined,
    PlusOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const ROLE_TAG = {
    'Super Admin': 'var(--color-primary)',
    Member: '#9333ea',
    Trainer: 'var(--color-info)',
    Client: 'var(--color-success)',
}

export default function Users() {
    const { message, modal } = App.useApp()
    const navigate = useNavigate()
    const { user: me } = useAuth()
    const isAdmin = me?.role === 'admin'
    const [search, setSearch] = useState('')
    const [role, setRole] = useState('all')
    const [status, setStatus] = useState('all')
    const list = usePagedList('/users', { params: { role, status }, search, pageSize: 10 })
    const { items: data, total, loading, fetching, error: loadError, setItems: setData, reload: fetchUsers } = list
    const [inviting, setInviting] = useState(false)
    const [savingInvite, setSavingInvite] = useState(false)
    const [inviteForm] = Form.useForm()

    const inviteAdmin = async () => {
        const v = await inviteForm.validateFields()
        setSavingInvite(true)
        try {
            const created = await api.post('/admins', v)
            list.setPage(1)
            fetchUsers()
            if (created.inviteWarning) {
                message.warning(`${v.name} created, but the invite email failed to send (${created.inviteWarning}). Temporary password: ${created.tempPassword}`, 10)
            } else {
                message.success(`${v.name} invited — an email was sent to ${v.email}`)
            }
            setInviting(false)
        } catch (err) {
            message.error(err.message)
        } finally {
            setSavingInvite(false)
        }
    }

    const resendInvite = (record) => {
        modal.confirm({
            title: 'Resend invite?',
            content: `This issues a new temporary password for ${record.name} and emails it to ${record.email}. Their current password stops working.`,
            okText: 'Resend invite',
            onOk: async () => {
                try {
                    const res = await api.post(`/users/${record.id}/resend-invite`)
                    setData((prev) => prev.map((u) => (u.id === record.id ? { ...u, mustChangePassword: true } : u)))
                    if (res.inviteWarning) {
                        message.warning(`Invite email failed to send (${res.inviteWarning}). Temporary password: ${res.tempPassword}`, 10)
                    } else {
                        message.success(`Invite re-sent to ${record.email}`)
                    }
                } catch (err) {
                    message.error(err.message)
                }
            },
        })
    }

    const toggleStatus = async (record) => {
        const next = record.status === 'active' ? 'inactive' : 'active'
        try {
            await api.patch(`/users/${record.id}/status`, { status: next })
            setData((prev) => prev.map((u) => (u.id === record.id ? { ...u, status: next } : u)))
            if (status !== 'all') fetchUsers()
            message.success(`${record.name} ${next === 'active' ? 'activated' : 'deactivated'}`)
        } catch (err) {
            message.error(err.message)
        }
    }

    const viewProfile = (record) => {
        // `record.id` is the User id — the Trainer/Client/Member detail pages key
        // on their own document's id (`profileId`), a different ObjectId.
        if (!record.profileId) {
            message.info('No detail page for this role')
            return
        }
        if (record.roleKey === 'member') navigate(`/members/${record.profileId}`)
        else if (record.roleKey === 'trainer') navigate(`/trainers/${record.profileId}`)
        else if (record.roleKey === 'client') navigate(`/clients/${record.profileId}`)
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
            render: (role) => (
                <Tag style={{ borderRadius: 999, border: 'none', padding: '2px 10px', color: '#fff', background: ROLE_TAG[role] }}>
                    {role}
                </Tag>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 170,
            render: (s, r) => (
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={s} />
                    {r.mustChangePassword && (
                        <Tag style={{ borderRadius: 999, border: 'none', padding: '2px 8px' }} color="gold">Invite pending</Tag>
                    )}
                </div>
            ),
        },
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
                                ...(isAdmin ? [{ key: 'resend-invite', icon: <MailOutlined />, label: 'Resend invite' }] : []),
                            ],
                            onClick: ({ key }) => {
                                if (key === 'view') viewProfile(r)
                                else if (key === 'toggle') toggleStatus(r)
                                else if (key === 'resend-invite') resendInvite(r)
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
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load users" error={loadError} onRetry={fetchUsers} /></div>

    return (
        <div>
            <PageHeader title="User Management" subtitle={`${total} users found`}>
                {isAdmin && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => { inviteForm.resetFields(); setInviting(true) }}>
                        Invite admin
                    </Button>
                )}
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
                <Select
                    value={role}
                    onChange={setRole}
                    style={{ width: 160 }}
                    options={[
                        { value: 'all', label: 'All roles' },
                        { value: 'admin', label: 'Super Admin' },
                        { value: 'member', label: 'Member' },
                        { value: 'trainer', label: 'Trainer' },
                        { value: 'client', label: 'Client' },
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

            <DataTable columns={columns} dataSource={data} loading={fetching} pagination={false} scrollX={1050} />
            <Pager list={list} pageSizeOptions={[10, 20, 50]} />

            <Modal
                title="Invite a new Admin"
                open={inviting}
                onCancel={() => setInviting(false)}
                onOk={inviteAdmin}
                okText="Send invite"
                confirmLoading={savingInvite}
                centered
            >
                <Form form={inviteForm} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Sarah Chen" />
                    </Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
                        <Input placeholder="sarah.chen@fittrack.io" />
                    </Form.Item>
                </Form>
                <p className="mt-1 text-xs text-text-muted">
                    A temporary password will be emailed to this address. They&apos;ll be asked to set their own password on first login.
                </p>
            </Modal>
        </div>
    )
}
