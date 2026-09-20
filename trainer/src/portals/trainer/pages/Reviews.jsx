import { useMemo, useState } from 'react'
import { Rate, Select, Skeleton } from 'antd'
import dayjs from 'dayjs'
import { StarOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import SectionError from '../../../components/feedback/SectionError'
import RatingSummary from '../../../components/reviews/RatingSummary'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { api } from '../../../services/api'

// Read-only: reviews are written by clients. A trainer can see them but not
// edit, delete or reply (the API has no such routes).
export default function Reviews() {
    const { data, loading, error, reload } = useAsyncData(() => api.get('/reviews'), [])
    const [rating, setRating] = useState('all')

    const items = useMemo(
        () => (data?.items || []).filter((r) => rating === 'all' || r.rating === Number(rating)),
        [data, rating],
    )

    return (
        <div>
            <PageHeader title="Reviews" subtitle="What your clients say about working with you." />

            {error ? (
                <div className="app-card"><SectionError title="Couldn't load your reviews" error={error} onRetry={reload} /></div>
            ) : loading ? (
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 4 }} /></div>
            ) : (
                <>
                    <RatingSummary summary={data?.summary} />

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
                                title={data?.items?.length ? 'No reviews with that rating' : 'No reviews yet'}
                                description={data?.items?.length ? undefined : 'Reviews from your clients will appear here.'}
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
                </>
            )}
        </div>
    )
}
