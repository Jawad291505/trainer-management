import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented, Button, Modal, Input, Checkbox, App, Tag } from 'antd'
import {
    CheckOutlined,
    CloseOutlined,
    CalendarOutlined,
    RedoOutlined,
    ArrowRightOutlined,
    EyeOutlined,
    WarningFilled,
    ClockCircleOutlined,
    CheckCircleFilled,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import { useCorrections } from '../../../context/CorrectionsContext'

const correctionAreaLabels = { diet: 'Diet plan', exercise: 'Exercise plan', progress: 'Progress / weigh-in', general: 'General' }
const correctionTypeLabels = { swap: 'Swap / substitute', 'too-hard': 'Too difficult', injury: 'Injury / pain', 'wrong-data': 'Wrong data', other: 'Other' }

const BUCKETS = [
    { key: 'open', label: 'Open' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'declined', label: 'Declined' },
    { key: 'all', label: 'All' },
]

// Where the trainer edits the plan a request is about.
const PLAN_PATH = { diet: '/diet-plans', exercise: '/exercise-plans' }

const fmt = (d) => dayjs(d).format('D MMM, h:mm A')

// Open first — high priority, then overdue, then oldest — so the most urgent
// request is always on top; answered ones follow, newest first.
function sortRequests(list) {
    const rank = (r) => (r.status !== 'open' ? 3 : r.priority === 'high' ? 0 : r.stale ? 1 : 2)
    return [...list].sort((a, b) => {
        const d = rank(a) - rank(b)
        if (d) return d
        return a.status === 'open'
            ? new Date(a.createdAt) - new Date(b.createdAt)
            : new Date(b.resolvedAt || b.createdAt) - new Date(a.resolvedAt || a.createdAt)
    })
}

function Pill({ color, soft, icon, children }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: soft, color }}>
            {icon}{children}
        </span>
    )
}

export default function Requests() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { requests, resolve, decline, reopen, markSeen } = useCorrections()
    const [active, setActive] = useState('open')
    const [action, setAction] = useState(null) // { req, mode: 'resolve' | 'decline' }
    const [reply, setReply] = useState('')
    const [withoutChange, setWithoutChange] = useState(false)
    const [saving, setSaving] = useState(false)

    const counts = useMemo(
        () => ({
            open: requests.filter((r) => r.status === 'open').length,
            resolved: requests.filter((r) => r.status === 'resolved').length,
            declined: requests.filter((r) => r.status === 'declined').length,
            attention: requests.filter((r) => r.status === 'open' && (r.priority === 'high' || r.stale)).length,
        }),
        [requests],
    )

    const list = useMemo(
        () => sortRequests(requests.filter((r) => (active === 'all' ? true : r.status === active))),
        [requests, active],
    )

    // Any interaction with a request counts as the trainer having looked at it.
    const touch = (r) => { if (r.status === 'open' && !r.seenAt) markSeen(r.id) }

    const go = (r, path) => { touch(r); navigate(path) }

    const startAction = (r, mode) => {
        touch(r)
        setAction({ req: r, mode })
        setReply('')
        setWithoutChange(false)
    }

    // A diet / exercise request that hasn't been followed by a published plan
    // edit needs an explicit "no change" confirmation before it can be resolved.
    const needsConfirm = action?.mode === 'resolve' && action.req.planChangedSince === false

    const submitAction = async () => {
        if (!reply.trim()) {
            message.warning('Add a short reply for the client')
            return
        }
        setSaving(true)
        try {
            if (action.mode === 'resolve') await resolve(action.req.id, reply.trim(), { withoutChange })
            else await decline(action.req.id, reply.trim())
            message.success(action.mode === 'resolve' ? 'Request resolved' : 'Request declined')
            setAction(null)
        } catch (err) {
            if (err.code === 'PLAN_NOT_CHANGED') {
                // The plan status was stale on screen — surface the confirmation now.
                setAction((a) => ({ ...a, req: { ...a.req, planChangedSince: false } }))
                message.warning(err.message)
            } else {
                message.error(err.message || 'Could not save — please try again')
            }
        } finally {
            setSaving(false)
        }
    }

    const doReopen = async (r) => {
        try { await reopen(r.id) } catch (err) { message.error(err.message || 'Could not reopen this request') }
    }

    return (
        <div>
            <PageHeader
                title="Correction Requests"
                subtitle="Changes your clients have asked for on their plans and progress."
            />

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Open" value={counts.open} accent="var(--color-warning)" />
                <StatCard label="Needs attention" value={counts.attention} accent="var(--color-danger)" hint="Priority or open 48h+" />
                <StatCard label="Resolved" value={counts.resolved} accent="var(--color-success)" />
                <StatCard label="Declined" value={counts.declined} />
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
                        const planPath = PLAN_PATH[r.area]
                        const open = r.status === 'open'
                        const dayLink = r.target?.kind === 'meal' && r.target.date
                        return (
                            <div key={r.id} className="app-card p-4" style={open && r.priority === 'high' ? { borderColor: 'var(--color-danger)' } : undefined}>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <button
                                        className="flex flex-1 items-start gap-3 text-left"
                                        onClick={() => go(r, `/clients/${r.clientId}`)}
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
                                                {open && r.priority === 'high' && (
                                                    <Pill color="var(--color-danger)" soft="var(--color-danger-soft)" icon={<WarningFilled />}>Priority</Pill>
                                                )}
                                                {open && r.stale && (
                                                    <Pill color="var(--color-warning)" soft="var(--color-warning-soft)" icon={<ClockCircleOutlined />}>Overdue</Pill>
                                                )}
                                                {open && !r.seenAt && (
                                                    <Pill color="var(--color-info)" soft="var(--color-info-soft)">New</Pill>
                                                )}
                                            </div>
                                            {r.item && (
                                                <div className="mt-0.5 text-sm font-medium text-text-secondary">
                                                    {r.item}
                                                    {r.target?.date && <span className="font-normal text-text-muted"> · {dayjs(r.target.date).format('ddd, D MMM')}</span>}
                                                </div>
                                            )}
                                            <p className="mt-1 mb-0 text-sm text-text-secondary">{r.note}</p>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                                                <span className="flex items-center gap-1.5"><CalendarOutlined /> {fmt(r.createdAt)}</span>
                                                {open && r.seenAt && <span className="flex items-center gap-1.5"><EyeOutlined /> Seen {fmt(r.seenAt)}</span>}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <StatusBadge status={r.status} />
                                    </div>
                                </div>

                                {open ? (
                                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                        {r.planChangedSince === true && (
                                            <Pill color="var(--color-success)" soft="var(--color-success-soft)" icon={<CheckCircleFilled />}>Plan updated since request</Pill>
                                        )}
                                        {r.planChangedSince === false && (
                                            <Pill color="var(--color-warning)" soft="var(--color-warning-soft)">Plan not changed yet</Pill>
                                        )}
                                        <div className="ml-auto flex flex-wrap items-center gap-2">
                                            {dayLink && (
                                                <Button size="small" onClick={() => go(r, `/clients/${r.clientId}?tab=diet&date=${r.target.date}`)}>
                                                    View that day
                                                </Button>
                                            )}
                                            {planPath && (
                                                <Button size="small" onClick={() => go(r, `${planPath}?client=${r.clientId}`)}>
                                                    Open plan <ArrowRightOutlined />
                                                </Button>
                                            )}
                                            <Button size="small" danger icon={<CloseOutlined />} onClick={() => startAction(r, 'decline')}>
                                                Decline
                                            </Button>
                                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => startAction(r, 'resolve')}>
                                                Resolve
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                        <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                                            <span className="font-semibold text-text-secondary">Your reply: </span>
                                            <span className="text-text-secondary">{r.reply}</span>
                                            {r.status === 'resolved' && r.planChanged === true && (
                                                <div className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--color-success)' }}>Plan was updated</div>
                                            )}
                                            {r.status === 'resolved' && r.planChanged === false && (
                                                <div className="mt-1.5 text-xs text-text-muted">Resolved without a plan change</div>
                                            )}
                                        </div>
                                        <button className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary" onClick={() => doReopen(r)}>
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
                title={action?.mode === 'decline' ? `Decline request from ${action?.req.clientName}` : `Resolve request from ${action?.req.clientName}`}
                open={!!action}
                onCancel={() => { if (!saving) setAction(null) }}
                onOk={submitAction}
                okText={action?.mode === 'decline' ? 'Decline' : 'Resolve'}
                okButtonProps={{ danger: action?.mode === 'decline', disabled: needsConfirm && !withoutChange }}
                confirmLoading={saving}
                centered
            >
                <p className="mb-2 text-sm text-text-secondary">
                    {action?.mode === 'decline'
                        ? 'Let the client know why this change cannot be made.'
                        : 'Tell the client what you changed, or why nothing needed to change.'}
                </p>
                {needsConfirm && (
                    <div className="mb-3 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-warning-soft)' }}>
                        <div className="font-semibold" style={{ color: 'var(--color-warning)' }}>
                            The client&apos;s {action.req.area} plan hasn&apos;t been updated since this request.
                        </div>
                        <div className="mt-1 mb-2 text-xs text-text-secondary">
                            Edit and publish the plan first, or confirm below if no change is needed.
                        </div>
                        <Checkbox checked={withoutChange} onChange={(e) => setWithoutChange(e.target.checked)}>
                            Resolve without changing the plan
                        </Checkbox>
                    </div>
                )}
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
