import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented, Button, Modal, Input, App, Tag } from 'antd'
import {
    CheckOutlined,
    CloseOutlined,
    CalendarOutlined,
    RedoOutlined,
    ArrowRightOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import { useCorrections } from '../../../context/CorrectionsContext'
import { correctionAreaLabels, correctionTypeLabels } from '../../../services/mockData'

const BUCKETS = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
]

const AREA_PATH = { diet: '/diet-plans', exercise: '/exercise-plans' }

export default function Requests() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { requests, resolve, decline, reopen } = useCorrections()
    const [active, setActive] = useState('open')
    const [action, setAction] = useState(null) // { id, mode: 'resolve' | 'decline', clientName }
    const [reply, setReply] = useState('')

    const counts = useMemo(
        () => ({
            open: requests.filter((r) => r.status === 'open').length,
            resolved: requests.filter((r) => r.status === 'resolved').length,
            declined: requests.filter((r) => r.status === 'declined').length,
        }),
        [requests],
    )

    const list = requests.filter((r) => (active === 'all' ? true : r.status === active))

    const startAction = (req, mode) => {
        setAction({ id: req.id, mode, clientName: req.clientName })
        setReply('')
    }

    const submitAction = () => {
        if (!reply.trim()) {
            message.warning('Add a short reply for the client')
            return
        }
        if (action.mode === 'resolve') {
            resolve(action.id, reply)
            message.success('Request resolved')
        } else {
            decline(action.id, reply)
            message.success('Request declined')
        }
        setAction(null)
    }

    return (
        <div>
            <PageHeader
                title="Correction Requests"
                subtitle="Changes your clients have asked for on their plans and progress."
            />

            <div className="mb-6 grid grid-cols-3 gap-4">
                <StatCard label="Open" value={counts.open} accent="var(--color-warning)" />
                <StatCard label="Resolved" value={counts.resolved} accent="var(--color-success)" />
                <StatCard label="Declined" value={counts.declined} accent="var(--color-danger)" />
            </div>

            <div className="mb-4 overflow-x-auto">
                <Segmented
                    value={active}
                    onChange={setActive}
                    options={BUCKETS.map((b) => ({
                        value: b.key,
                        label: b.key === 'all' ? 'All' : `${b.label} (${counts[b.key] ?? 0})`,
                    }))}
                />
            </div>

            {list.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="Nothing here" description="No requests in this view." />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {list.map((r) => {
                        const planPath = AREA_PATH[r.area]
                        return (
                            <div key={r.id} className="app-card p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <button
                                        className="flex flex-1 items-start gap-3 text-left"
                                        onClick={() => navigate(`/clients/${r.clientId}`)}
                                    >
                                        <UserAvatar name={r.clientName} color={r.avatarColor} size={42} />
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-text-primary transition-colors hover:text-primary">
                                                    {r.clientName}
                                                </span>
                                                <Tag bordered={false} style={{ borderRadius: 999 }}>
                                                    {correctionAreaLabels[r.area] || r.area}
                                                </Tag>
                                                <span className="text-xs font-medium text-text-muted">
                                                    {correctionTypeLabels[r.type] || r.type}
                                                </span>
                                            </div>
                                            {r.item && (
                                                <div className="mt-0.5 text-sm font-medium text-text-secondary">{r.item}</div>
                                            )}
                                            <p className="mt-1 mb-0 text-sm text-text-secondary">{r.note}</p>
                                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-muted">
                                                <CalendarOutlined /> {r.createdAt}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <StatusBadge status={r.status} />
                                    </div>
                                </div>

                                {r.status === 'open' ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                        {planPath && (
                                            <Button size="small" onClick={() => navigate(planPath)}>
                                                Open plan <ArrowRightOutlined />
                                            </Button>
                                        )}
                                        <Button
                                            size="small"
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => startAction(r, 'decline')}
                                        >
                                            Decline
                                        </Button>
                                        <Button
                                            size="small"
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            onClick={() => startAction(r, 'resolve')}
                                        >
                                            Resolve
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                                            <span className="font-semibold text-text-secondary">Your reply: </span>
                                            <span className="text-text-secondary">{r.reply}</span>
                                        </div>
                                        <button
                                            className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary"
                                            onClick={() => reopen(r.id)}
                                        >
                                            <RedoOutlined /> Reopen
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal
                title={action?.mode === 'decline' ? `Decline request from ${action?.clientName}` : `Resolve request from ${action?.clientName}`}
                open={!!action}
                onCancel={() => setAction(null)}
                onOk={submitAction}
                okText={action?.mode === 'decline' ? 'Decline' : 'Resolve'}
                okButtonProps={{ danger: action?.mode === 'decline' }}
                centered
            >
                <p className="mb-2 text-sm text-text-secondary">
                    {action?.mode === 'decline'
                        ? 'Let the client know why this change cannot be made.'
                        : 'Tell the client what you changed. Update the plan itself separately.'}
                </p>
                <Input.TextArea
                    rows={4}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a short reply…"
                />
            </Modal>
        </div>
    )
}
