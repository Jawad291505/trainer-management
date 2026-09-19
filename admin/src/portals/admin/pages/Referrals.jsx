import { useState } from 'react'
import { Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
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
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import AsyncSection from '../../../components/feedback/AsyncSection'
import SectionError from '../../../components/feedback/SectionError'

export default function Referrals() {
    // The table rows are searched / filtered / paged by the backend; the headline
    // stats and leaderboard come back in the same response and always cover every referral.
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const overviewRes = usePagedList('/referrals/overview', { params: { status }, search, pageSize: 10 })
    const rows = overviewRes.items
    const leaderboard = overviewRes.data?.leaderboard || []
    const stats = overviewRes.data?.stats

    const cards = !stats ? [] : [
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
        { title: 'Date', dataIndex: 'date', width: 130, sorter: (a, b) => String(a.date).localeCompare(String(b.date)), render: (d) => <span className="text-text-secondary">{dayjs(d).format('YYYY-MM-DD')}</span> },
        { title: 'Status', dataIndex: 'status', width: 130, render: (s) => <StatusBadge status={s === 'joined' ? 'active' : s} /> },
    ]

    return (
        <div>
            <PageHeader title="Referrals" subtitle="Track which trainers referred one another and how each code performs." />

            {overviewRes.error ? (
                <SectionError title="Couldn't load referral stats" error={overviewRes.error} onRetry={overviewRes.reload} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewRes.loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} /></div>
                        ))
                        : cards.map((c, i) => <StatCard key={i} {...c} />)}
                </div>
            )}

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
                    <AsyncSection loading={overviewRes.loading} error={overviewRes.error} onRetry={overviewRes.reload} errorTitle="Couldn't load referrals" rows={6}>
                        <DataTable columns={columns} dataSource={rows} loading={overviewRes.fetching} pagination={false} scrollX={760} />
                        <Pager list={overviewRes} pageSizeOptions={[10, 20, 50]} />
                    </AsyncSection>
                </div>

                <ChartCard title="Referral Leaderboard" subtitle="Trainers ranked by invites">
                    <AsyncSection loading={overviewRes.loading} error={overviewRes.error} onRetry={overviewRes.reload} errorTitle="Couldn't load the leaderboard" rows={5}>
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {leaderboard.map((t, i) => (
                            <div key={t.trainerId} className="flex items-center justify-between py-3">
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
                    </AsyncSection>
                </ChartCard>
            </div>
        </div>
    )
}
