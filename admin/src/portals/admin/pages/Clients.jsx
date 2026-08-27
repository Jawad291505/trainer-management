import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Dropdown, Button, Progress, App } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    UserSwitchOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import { confirmDelete } from '../../../utils/confirm'
import { clients as seed, trainers } from '../../../services/mockData'

export default function Clients() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [trainerId, setTrainerId] = useState('all')

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
                <Button type="primary">Add client</Button>
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
        </div>
    )
}
