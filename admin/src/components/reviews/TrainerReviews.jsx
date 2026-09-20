import { useMemo, useState } from 'react'
import { Rate, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { StarOutlined } from '@ant-design/icons'
import EmptyState from '../common/EmptyState'
import UserAvatar from '../common/UserAvatar'
import SectionError from '../feedback/SectionError'
import RatingSummary from './RatingSummary'

// Read-only review list for one trainer. `res` is the useAsyncData result of
// GET /reviews?trainer=<id> (items + summary).
export default function TrainerReviews({ res }) {
    const [rating, setRating] = useState('all')
    const all = res.data?.items || []
    const items = useMemo(() => all.filter((r) => rating === 'all' || r.rating === Number(rating)), [all, rating])

    if (res.loading) return <div className="app-card p-5"><Skeleton active paragraph={{ rows: 5 }} /></div>
    if (res.error) return <div className="app-card"><SectionError title="Couldn't load this trainer's reviews" error={res.error} onRetry={res.reload} /></div>

    return (
        <div>
            <RatingSummary summary={res.data?.summary} />

            <div className="mt-6 mb-3 flex items-center justify-between gap-3">
                <h3 className="section-title m-0">All reviews</h3>
                <Select
                    value={rating}
                    onChange={setRating}
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'All ratings' },
                        ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n === 1 ? '' : 's'}` })),
                    ]}
                />
            </div>

            {items.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        icon={<StarOutlined />}
                        title={all.length ? 'No reviews with that rating' : 'No reviews yet'}
                        description={all.length ? undefined : "Clients' reviews of this trainer will appear here."}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((r) => (
                        <div key={r.id} className="app-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <UserAvatar name={r.clientName || ''} color={r.clientAvatarColor} size={36} />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-text-primary">{r.clientName}</div>
                                        <div className="text-xs text-text-muted">{dayjs(r.updatedAt).format('D MMM YYYY')}</div>
                                    </div>
                                </div>
                                <Rate disabled value={r.rating} style={{ fontSize: 14 }} />
                            </div>
                            {r.comment && <p className="mt-3 mb-0 whitespace-pre-wrap text-sm text-text-secondary">{r.comment}</p>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
