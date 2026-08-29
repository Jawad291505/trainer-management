import { useState } from 'react'
import { Segmented, Tag, Popconfirm, Button, App } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import RequestCorrection from '../components/RequestCorrection'
import { useCorrections } from '../../../context/CorrectionsContext'
import { correctionAreaLabels, correctionTypeLabels } from '../../../services/mockData'

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Awaiting reply' },
    { value: 'answered', label: 'Answered' },
]

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
                        <div key={r.id} className="app-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Tag bordered={false} style={{ borderRadius: 999 }}>
                                            {correctionAreaLabels[r.area] || r.area}
                                        </Tag>
                                        <span className="text-xs font-medium text-text-muted">
                                            {correctionTypeLabels[r.type] || r.type}
                                        </span>
                                    </div>
                                    {r.item && <div className="mt-1 text-sm font-medium text-text-secondary">{r.item}</div>}
                                    <p className="mt-1 mb-0 text-sm text-text-secondary">{r.note}</p>
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
                                        <CalendarOutlined /> Sent {r.createdAt}
                                        {r.resolvedAt && ` · answered ${r.resolvedAt}`}
                                    </div>
                                </div>
                                <StatusBadge status={r.status} />
                            </div>

                            {r.status !== 'open' && r.reply && (
                                <div
                                    className="mt-3 rounded-lg px-3 py-2 text-sm"
                                    style={{ background: 'var(--color-surface-secondary)' }}
                                >
                                    <span className="font-semibold text-text-secondary">Trainer’s reply: </span>
                                    <span className="text-text-secondary">{r.reply}</span>
                                </div>
                            )}

                            {r.status === 'open' && (
                                <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                    <Popconfirm
                                        title="Cancel this request?"
                                        okText="Cancel request"
                                        okButtonProps={{ danger: true }}
                                        onConfirm={() => {
                                            cancelRequest(r.id)
                                            message.success('Request cancelled')
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
