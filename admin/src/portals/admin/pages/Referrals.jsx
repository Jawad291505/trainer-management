import { useMemo, useState } from 'react'
import { Select } from 'antd'
import {
    ShareAltOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    TrophyOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import { buildReferralRows, buildLeaderboard, getReferralStats } from '../../../services/referrals'

export default function Referrals() {
    const rows = useMemo(() => buildReferralRows(), [])
    const leaderboard = useMemo(() => buildLeaderboard(), [])
    const stats = useMemo(() => getReferralStats(), [])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter((r) => {
            const matchQ =
                !q ||
                r.referrerName.toLowerCase().includes(q) ||
                r.refereeName.toLowerCase().includes(q) ||
                r.code.toLowerCase().includes(q)
            const matchS = status === 'all' || r.status === status
            return matchQ && matchS
        })
    }, [rows, search, status])

    const cards = [
        { icon: <ShareAltOutlined />, label: 'Total Referrals', value: stats.total, hint: `${stats.last30} in the last 30 days` },
        { icon: <CheckCircleOutlined />, label: 'Joined', value: stats.joined, accent: 'var(--color-success)' },
        { icon: <ClockCircleOutlined />, label: 'Pending', value: stats.pending, accent: 'var(--color-warning)' },
        { icon: <TrophyOutlined />, label: 'Top Referrer', value: stats.topReferrerName, hint: `${stats.topReferrerCount} trainers referred` },
    ]

    const columns = [
        {
            title: 'Referrer',
            dataIndex: 'referrerName',
            render: (name) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={name} size={34} />
                    <span className="font-semibold text-text-primary">{name}</span>
                </div>
            ),
        },
        {
            title: 'Referred trainer',
            dataIndex: 'refereeName',
            render: (name, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={name} size={34} />
                    <div>
                        <div className="font-semibold text-text-primary">{name}</div>
                        <div className="text-xs text-text-muted">{r.refereeEmail}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Code used', dataIndex: 'code', width: 160, render: (c) => <span className="font-mono text-xs text-text-secondary">{c}</span> },
        { title: 'Date', dataIndex: 'date', width: 130, sorter: (a, b) => a.date.localeCompare(b.date), render: (d) => <span className="text-text-secondary">{d}</span> },
        { title: 'Status', dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s === 'joined' ? 'active' : s} /> },
    ]

    return (
        <div>
            <PageHeader title="Referrals" subtitle="Track which trainers referred one another and how each code performs." />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c, i) => (
                    <StatCard key={i} {...c} />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <FilterBar>
                        <SearchInput value={search} onChange={setSearch} placeholder="Search trainer or code…" />
                        <Select
                            value={status}
                            onChange={setStatus}
                            style={{ width: 150 }}
                            options={[
                                { value: 'all', label: 'All status' },
                                { value: 'joined', label: 'Joined' },
                                { value: 'pending', label: 'Pending' },
                            ]}
                        />
                    </FilterBar>
                    <DataTable columns={columns} dataSource={filtered} pageSize={8} scrollX={760} />
                </div>

                <ChartCard title="Referral Leaderboard" subtitle="Trainers ranked by invites">
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {leaderboard.map((t, i) => (
                            <div key={t.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-5 text-sm font-bold text-text-muted">{i + 1}</span>
                                    <UserAvatar name={t.name} size={32} />
                                    <div>
                                        <div className="text-sm font-semibold text-text-primary">{t.name}</div>
                                        <div className="text-xs text-text-muted font-mono">{t.code}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-bold text-text-primary">{t.total}</div>
                                    <div className="text-xs text-text-muted">{t.joined} joined</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    )
}
