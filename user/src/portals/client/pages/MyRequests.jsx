import { useState } from 'react'
import { Segmented, Tag, Popconfirm, Button, App } from 'antd'
import { CalendarOutlined, EyeOutlined, WarningFilled, CheckCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../../../components/common/PageHeader'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import RequestCorrection from '../components/RequestCorrection'
import { useCorrections } from '../../../context/CorrectionsContext'

const correctionAreaLabels = { diet: 'Diet plan', exercise: 'Exercise plan', progress: 'Progress / weigh-in', general: 'General' }
const correctionTypeLabels = { swap: 'Swap / substitute', 'too-hard': 'Too difficult', injury: 'Injury / pain', 'wrong-data': 'Wrong data', other: 'Other' }

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Awaiting reply' },
    { value: 'answered', label: 'Answered' },
]

const fmt = (d) => dayjs(d).format('D MMM, h:mm A')

export default function MyRequests() {
    const { message } = App.useApp()
    const { requests, cancelRequest } = useCorrections()
    const [filter, setFilter] = useState('all')

    const list = requests.filter((r) => {
        if (filter === 'open') return r.status === 'open'
        if (filter === 'answered') return r.status !== 'open'
        return true
    })

    return (
        <div>
            <PageHeader
                title="My Requests"
                subtitle="Corrections you've asked your trainer to make."
            >
                <RequestCorrection area="general" type="primary" />
            </PageHeader>

            <div className="mb-4">
                <Segmented value={filter} onChange={setFilter} options={FILTERS} />
            </div>

            {list.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No requests yet"
                        description="Use “Request a correction” on your Diet, Exercise or Progress page to ask your trainer for a change."
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {list.map((r) => (
                        <div key={r.id} className="app-card p-4" style={r.priority === 'high' && r.status === 'open' ? { borderColor: 'var(--color-danger)' } : undefined}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Tag bordered={false} style={{ borderRadius: 999 }}>
                                            {correctionAreaLabels[r.area] || r.area}
                                        </Tag>
                                        <span className="text-xs font-medium text-text-muted">
                                            {correctionTypeLabels[r.type] || r.type}
                                        </span>
                                        {r.priority === 'high' && (
                                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                                                <WarningFilled /> Priority
                                            </span>
                                        )}
                                    </div>
                                    {r.item && (
                                        <div className="mt-1 text-sm font-medium text-text-secondary">
                                            {r.item}
                                            {r.target?.date && <span className="font-normal text-text-muted"> · {dayjs(r.target.date).format('ddd, D MMM')}</span>}
                                        </div>
                                    )}
                                    <p className="mt-1 mb-0 text-sm text-text-secondary">{r.note}</p>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                                        <span className="flex items-center gap-1.5"><CalendarOutlined /> Sent {fmt(r.createdAt)}</span>
                                        {r.status === 'open' && r.seenAt && (
                                            <span className="flex items-center gap-1.5" style={{ color: 'var(--color-info)' }}>
                                                <EyeOutlined /> Seen by your trainer {fmt(r.seenAt)}
                                            </span>
                                        )}
                                        {r.status === 'open' && !r.seenAt && <span>Not seen yet</span>}
                                        {r.resolvedAt && <span>Answered {fmt(r.resolvedAt)}</span>}
                                    </div>
                                </div>
                                <StatusBadge status={r.status} />
                            </div>

                            {r.status !== 'open' && (
                                <div
                                    className="mt-3 rounded-lg px-3 py-2 text-sm"
                                    style={{ background: 'var(--color-surface-secondary)' }}
                                >
                                    <span className="font-semibold text-text-secondary">Trainer’s reply: </span>
                                    <span className="text-text-secondary">{r.reply}</span>
                                    {r.status === 'resolved' && r.planChanged === true && (
                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>
                                            <CheckCircleFilled /> Your plan was updated
                                        </div>
                                    )}
                                    {r.status === 'resolved' && r.planChanged === false && (
                                        <div className="mt-1.5 text-xs text-text-muted">Answered without a change to your plan</div>
                                    )}
                                </div>
                            )}

                            {r.status === 'open' && (
                                <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                    <Popconfirm
                                        title="Cancel this request?"
                                        okText="Cancel request"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={async () => {
                                            try {
                                                await cancelRequest(r.id)
                                                message.success('Request cancelled')
                                            } catch (err) {
                                                message.error(err.message || 'Could not cancel this request')
                                            }
                                        }}
                                    >
                                        <Button size="small" danger type="text">
                                            Cancel request
                                        </Button>
                                    </Popconfirm>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
