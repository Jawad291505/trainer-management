import { useEffect, useState } from 'react'
import { Rate, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { StarOutlined, MessageOutlined, WarningOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import UserAvatar from '../../../components/common/UserAvatar'
import AsyncSection from '../../../components/feedback/AsyncSection'
import SectionError from '../../../components/feedback/SectionError'
import RatingSummary from '../../../components/reviews/RatingSummary'
import { usePagedList } from '../../../hooks/usePagedList'
import { api } from '../../../services/api'

// Read-only oversight of client -> trainer reviews. An admin sees every trainer's
// reviews; a member sees only their own trainers' (the backend scopes it).
export default function Reviews() {
    const [search, setSearch] = useState('')
    const [trainerId, setTrainerId] = useState('all')
    const [rating, setRating] = useState('all')
    const [trainers, setTrainers] = useState([])

    useEffect(() => {
        api.get('/trainers', { ttl: 30_000 }).then((t) => setTrainers(t.items || [])).catch(() => {})
    }, [])

    // Rows are searched / filtered / paged by the backend; `summary` comes back in
    // the same response and covers the trainer + search filters (not the star filter).
    const list = usePagedList('/reviews', { params: { trainer: trainerId, rating }, search, pageSize: 10 })
    const summary = list.data?.summary
    const low = (summary?.distribution?.[1] || 0) + (summary?.distribution?.[2] || 0)

    const cards = !summary ? [] : [
        { icon: <MessageOutlined />, label: 'Total Reviews', value: summary.count },
        { icon: <StarOutlined />, label: 'Average Rating', value: summary.count ? summary.average.toFixed(1) : '–', accent: 'var(--color-warning)' },
        { icon: <WarningOutlined />, label: 'Low Ratings', value: low, hint: '1–2 stars', accent: 'var(--color-danger)' },
    ]

    const columns = [
        {
            title: 'Client',
            dataIndex: 'clientName',
            render: (name, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={name || ''} color={r.clientAvatarColor} size={34} />
                    <span className="font-semibold text-text-primary">{name}</span>
                </div>
            ),
        },
        {
            title: 'Trainer',
            dataIndex: 'trainerName',
            render: (name, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={name || ''} color={r.trainerAvatarColor} size={34} />
                    <span className="text-text-primary">{name}</span>
                </div>
            ),
        },
        { title: 'Rating', dataIndex: 'rating', width: 160, render: (v) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
        {
            title: 'Comment',
            dataIndex: 'comment',
            render: (c) => (c ? <span className="text-text-secondary">{c}</span> : <span className="text-text-muted">—</span>),
        },
        { title: 'Date', dataIndex: 'updatedAt', width: 130, render: (d) => <span className="text-text-secondary">{dayjs(d).format('YYYY-MM-DD')}</span> },
    ]

    return (
        <div>
            <PageHeader title="Reviews" subtitle="What clients say about their trainers." />

            {list.error ? (
                <SectionError title="Couldn't load reviews" error={list.error} onRetry={list.reload} />
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {list.loading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} /></div>
                            ))
                            : cards.map((c, i) => <StatCard key={i} {...c} />)}
                    </div>

                    {!list.loading && <div className="mt-4"><RatingSummary summary={summary} /></div>}
                </>
            )}

            <div className="mt-6">
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search client or trainer…" />
                    <Select
                        value={trainerId}
                        onChange={setTrainerId}
                        style={{ width: 190 }}
                        options={[{ value: 'all', label: 'All trainers' }, ...trainers.map((t) => ({ value: t.id, label: t.name }))]}
                    />
                    <Select
                        value={rating}
                        onChange={setRating}
                        style={{ width: 150 }}
                        options={[
                            { value: 'all', label: 'All ratings' },
                            ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? '' : 's'}` })),
                        ]}
                    />
                </FilterBar>
                <AsyncSection loading={list.loading} error={list.error} onRetry={list.reload} errorTitle="Couldn't load reviews" rows={6}>
                    <DataTable columns={columns} dataSource={list.items} loading={list.fetching} pagination={false} scrollX={760} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </AsyncSection>
            </div>
        </div>
    )
}
