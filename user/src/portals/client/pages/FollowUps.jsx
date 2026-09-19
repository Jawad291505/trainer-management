import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag } from 'antd'
import dayjs from 'dayjs'
import { CalendarOutlined, MessageOutlined, CheckSquareOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { listFollowUps } from '../../../services/followUps'
import { formatTime } from '../../../utils/time'

const TYPE_LABELS = { 'check-in': 'Check-in', call: 'Call', 'in-person': 'In-person', 'plan-review': 'Plan review' }

const whenLabel = (f) => `${dayjs(f.date).format('ddd, D MMM YYYY')}${f.time ? ` · ${formatTime(f.time)}` : ''}`

function relativeDay(date) {
    const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day')
    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    if (diff > 1) return `In ${diff} days`
    return `${Math.abs(diff)} day${diff === -1 ? '' : 's'} ago`
}

export default function FollowUps() {
    const navigate = useNavigate()
    const [items, setItems] = useState(null)

    useEffect(() => {
        listFollowUps().then(setItems).catch(() => setItems([]))
    }, [])

    if (items === null) return <LoadingSkeleton cards={2} rows={3} />

    // Open ones (today / upcoming / overdue) soonest-first; finished ones newest-first.
    const open = items.filter((f) => f.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))
    const history = items.filter((f) => f.status !== 'scheduled').sort((a, b) => b.date.localeCompare(a.date))
    const [next, ...later] = open
    const trainerName = items[0]?.trainerName || 'your trainer'

    return (
        <div>
            <PageHeader title="Follow-ups" subtitle={`Your check-ins with ${trainerName}.`}>
                <Button icon={<MessageOutlined />} onClick={() => navigate('/messages')}>Message Trainer</Button>
            </PageHeader>

            {next ? (
                <div className="app-card animate-rise mb-4 p-5" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Next check-in</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xl font-extrabold text-text-primary">{relativeDay(next.date)}</span>
                        <Tag className="m-0">{TYPE_LABELS[next.type] || next.type}</Tag>
                        {next.bucket === 'overdue' && <Tag color="orange" className="m-0">Awaiting reschedule</Tag>}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                        <CalendarOutlined /> {whenLabel(next)}
                    </div>
                    {next.note && <div className="mt-2 text-sm text-text-secondary">{next.note}</div>}
                </div>
            ) : (
                <div className="app-card mb-4">
                    <EmptyState
                        icon={<CheckSquareOutlined />}
                        title="No check-ins scheduled"
                        description="Your trainer will schedule your next follow-up here."
                    />
                </div>
            )}

            {later.length > 0 && (
                <div className="mb-6">
                    <h3 className="section-title mb-3">Coming up</h3>
                    <div className="flex flex-col gap-3">
                        {later.map((f) => (
                            <div key={f.id} className="app-card flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-text-primary">{whenLabel(f)}</div>
                                    <div className="text-xs text-text-muted">{TYPE_LABELS[f.type] || f.type}{f.note ? ` · ${f.note}` : ''}</div>
                                </div>
                                <span className="text-xs font-semibold text-text-secondary">{relativeDay(f.date)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {history.length > 0 && (
                <div>
                    <h3 className="section-title mb-3">History</h3>
                    <div className="flex flex-col gap-3">
                        {history.map((f) => (
                            <div key={f.id} className="app-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-text-primary">{whenLabel(f)}</div>
                                        <div className="text-xs text-text-muted">{TYPE_LABELS[f.type] || f.type}{f.note ? ` · ${f.note}` : ''}</div>
                                    </div>
                                    <Tag color={f.status === 'completed' ? 'green' : 'default'} className="m-0 capitalize">{f.status}</Tag>
                                </div>
                                {f.outcome && (
                                    <div className="mt-3 rounded-lg p-3 text-sm text-text-secondary" style={{ background: 'var(--color-surface-secondary)' }}>
                                        <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">From your trainer</div>
                                        {f.outcome}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
