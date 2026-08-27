import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Segmented, Progress, Dropdown, Button } from 'antd'
import {
    AppstoreOutlined,
    UnorderedListOutlined,
    MoreOutlined,
    EyeOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    WarningFilled,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import EmptyState from '../../../components/common/EmptyState'
import ClientCard from '../components/ClientCard'
import { clients as seed } from '../../../services/mockData'

export default function Clients() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [view, setView] = useState('table')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return seed.filter((c) => {
            const matchQ = !q || c.name.toLowerCase().includes(q) || c.goal.toLowerCase().includes(q)
            const matchS = status === 'all' || c.status === status
            return matchQ && matchS
        })
    }, [search, status])

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
            <PageHeader title="My Clients" subtitle={`${filtered.length} clients assigned to you`} />

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
        </div>
    )
}
