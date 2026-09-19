import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Segmented, Button, App, Dropdown, Tag } from 'antd'
import dayjs from 'dayjs'
import {
    PlusOutlined,
    CheckOutlined,
    MessageOutlined,
    CalendarOutlined,
    WarningFilled,
    MoreOutlined,
    LockOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import PageSpin from '../../../components/common/PageSpin'
import SectionError from '../../../components/feedback/SectionError'
import { useClientList } from '../../../hooks/useClientList'
import { ScheduleFollowUpModal, CompleteFollowUpModal } from '../components/FollowUpModals'
import { api } from '../../../services/api'
import { FOLLOWUP_BUCKETS as BUCKETS, FOLLOWUP_TYPE_LABELS } from '../../../constants/followUp'
import { formatTime } from '../../../utils/time'

const byDate = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)

export default function FollowUps() {
    const { message, modal } = App.useApp()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [data, setData] = useState([])
    const [active, setActive] = useState('today')
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [scheduling, setScheduling] = useState(null) // { followUp?, clientId? }
    const [completing, setCompleting] = useState(null) // follow-up being completed

    // The client roster is only needed by the schedule modal — fetch it the first
    // time the modal opens instead of with the page.
    const [needClients, setNeedClients] = useState(false)
    useEffect(() => { if (scheduling) setNeedClients(true) }, [scheduling])
    const { clients: clientList, loading: clientsLoading } = useClientList(needClients)

    const load = useCallback(() => {
        setLoading(true)
        setLoadError(null)
        api.get('/followups')
            .then((f) => {
                const items = f.items || []
                setData(items)
                // Land on whatever needs attention first.
                const count = (key) => items.filter((i) => i.bucket === key).length
                setActive(count('overdue') ? 'overdue' : count('today') ? 'today' : 'upcoming')

                // Deep link from a client profile: /follow-ups?new=<clientId>
                const preset = searchParams.get('new')
                if (preset) {
                    setScheduling({ clientId: preset })
                    setSearchParams({}, { replace: true })
                }
            })
            .catch((err) => setLoadError(err))
            .finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    useEffect(() => { load() }, [load])

    const counts = BUCKETS.reduce((acc, b) => {
        acc[b.key] = data.filter((f) => f.bucket === b.key).length
        return acc
    }, {})

    // Completed / missed read newest-first; everything else soonest-first.
    const list = data
        .filter((f) => f.bucket === active)
        .sort((a, b) => (active === 'completed' || active === 'missed' ? byDate(b, a) : byDate(a, b)))

    const upsert = (...rows) =>
        setData((prev) => {
            const map = new Map(prev.map((f) => [f.id, f]))
            rows.filter(Boolean).forEach((r) => map.set(r.id, r))
            return [...map.values()]
        })

    const onScheduled = (saved) => {
        upsert(saved)
        setScheduling(null)
        setActive(saved.bucket)
    }

    const onCompleted = (completed, next) => {
        upsert(completed, next)
        setCompleting(null)
        setActive('completed')
    }

    const setStatus = async (f, status) => {
        try {
            const saved = await api.patch(`/followups/${f.id}`, { status })
            upsert(saved)
            message.success(status === 'missed' ? 'Marked as missed' : 'Follow-up reopened')
        } catch (err) {
            message.error(err.message || 'Could not update follow-up')
        }
    }

    const remove = (f) =>
        modal.confirm({
            title: 'Delete this follow-up?',
            content: `${f.clientName} — ${dayjs(f.date).format('D MMM YYYY')}`,
            okText: 'Delete',
            okButtonProps: { danger: true },
            centered: true,
            onOk: async () => {
                try {
                    await api.delete(`/followups/${f.id}`)
                    setData((prev) => prev.filter((x) => x.id !== f.id))
                    message.success('Follow-up deleted')
                } catch (err) {
                    message.error(err.message || 'Could not delete follow-up')
                }
            },
        })

    const menuFor = (f) => ({
        items: [
            { key: 'edit', label: 'Edit / reschedule' },
            f.status === 'scheduled'
                ? { key: 'missed', label: 'Mark as missed' }
                : { key: 'reopen', label: 'Reopen' },
            { key: 'delete', label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'edit') setScheduling({ followUp: f })
            else if (key === 'missed') setStatus(f, 'missed')
            else if (key === 'reopen') setStatus(f, 'scheduled')
            else if (key === 'delete') remove(f)
        },
    })

    if (loading) return <PageSpin />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load follow-ups" error={loadError} onRetry={load} /></div>

    return (
        <div>
            <PageHeader title="Follow-ups" subtitle="Stay on top of client check-ins.">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setScheduling({})}>
                    New follow-up
                </Button>
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard icon={<CalendarOutlined />} label="Due Today" value={counts.today} accent="var(--color-info)" />
                <StatCard icon={<ClockCircleOutlined />} label="Upcoming" value={counts.upcoming} />
                <StatCard icon={<WarningFilled />} label="Overdue" value={counts.overdue} accent="var(--color-danger)" />
                <StatCard icon={<CheckCircleOutlined />} label="Completed" value={counts.completed} accent="var(--color-success)" />
            </div>

            <div className="mb-4 overflow-x-auto">
                <Segmented
                    value={active}
                    onChange={setActive}
                    options={BUCKETS.map((b) => ({ value: b.key, label: `${b.label} (${counts[b.key]})` }))}
                />
            </div>

            {list.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="Nothing here" description="No follow-ups in this bucket." />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {list.map((f) => {
                        const overdue = f.bucket === 'overdue'
                        const open = f.status === 'scheduled'
                        return (
                            <div
                                key={f.id}
                                className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                                style={overdue ? { borderLeft: '3px solid var(--color-danger)' } : undefined}
                            >
                                <button className="flex flex-1 items-start gap-3 text-left" onClick={() => navigate(`/clients/${f.clientId}`)}>
                                    <UserAvatar name={f.clientName} color={f.avatarColor} size={42} />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{f.clientName}</span>
                                            <Tag className="m-0">{FOLLOWUP_TYPE_LABELS[f.type] || f.type}</Tag>
                                            {overdue && <WarningFilled style={{ color: 'var(--color-danger)', fontSize: 12 }} />}
                                        </div>
                                        <div className="text-xs text-text-muted">{f.goal}{f.note ? ` · ${f.note}` : ''}</div>
                                        {f.outcome && <div className="mt-1 text-xs text-text-secondary">Outcome: {f.outcome}</div>}
                                        {f.privateNote && (
                                            <div className="mt-1 flex items-center gap-1 text-xs italic text-text-muted">
                                                <LockOutlined /> {f.privateNote}
                                            </div>
                                        )}
                                    </div>
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 text-xs" style={{ color: overdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                                        <CalendarOutlined /> {dayjs(f.date).format('ddd, D MMM')}{f.time ? ` · ${formatTime(f.time)}` : ''}
                                    </span>
                                    <Button size="small" icon={<MessageOutlined />} onClick={() => navigate('/messages')} />
                                    {open && (
                                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => setCompleting(f)}>
                                            Complete
                                        </Button>
                                    )}
                                    <Dropdown menu={menuFor(f)} trigger={['click']}>
                                        <Button size="small" icon={<MoreOutlined />} />
                                    </Dropdown>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ScheduleFollowUpModal
                open={!!scheduling}
                followUp={scheduling?.followUp}
                initialClientId={scheduling?.clientId}
                clients={clientList}
                clientsLoading={clientsLoading}
                onClose={() => setScheduling(null)}
                onSaved={onScheduled}
            />
            <CompleteFollowUpModal
                open={!!completing}
                followUp={completing}
                onClose={() => setCompleting(null)}
                onDone={onCompleted}
            />
        </div>
    )
}
