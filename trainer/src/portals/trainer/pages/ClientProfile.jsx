import { useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button, Tabs, Tag, Image, Input, InputNumber, Modal, App, Collapse, Empty, Skeleton } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    PhoneOutlined,
    AimOutlined,
    MessageOutlined,
    CalendarOutlined,
    EditOutlined,
    LineChartOutlined,
    DashboardOutlined,
    CrownOutlined,
} from '@ant-design/icons'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import { useCorrections } from '../../../context/CorrectionsContext'
import { useProgressPhotos } from '../../../context/ProgressPhotosContext'
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import { useAsyncData, orNullOn404 } from '../../../hooks/useAsyncData'
import ExerciseDayCard from '../components/ExerciseDayCard'
import DietDayProgress from '../../../components/progress/DietDayProgress'
import GlucoseChart from '../../../components/progress/GlucoseChart'
import HabitHistory from '../../../components/progress/HabitHistory'
import { api } from '../../../services/api'
import { FOLLOWUP_TYPE_LABELS } from '../../../constants/followUp'
import { formatTime } from '../../../utils/time'

const correctionAreaLabels = { diet: 'Diet plan', exercise: 'Exercise plan', progress: 'Progress / weigh-in', general: 'General' }
const correctionTypeLabels = { swap: 'Swap / substitute', 'too-hard': 'Too difficult', injury: 'Injury / pain', 'wrong-data': 'Wrong data', other: 'Other' }
const progressPhotoAngleLabels = { front: 'Front', side: 'Side', back: 'Back', other: 'Other' }

// Photos one client has shared, with an inline editor for the trainer's per-photo note.
function PhotosTab({ clientId, clientName }) {
    const { message } = App.useApp()
    const { photosForClient, fetchForClient, loadedFor, setNote, clearNote } = useProgressPhotos()
    const groups = photosForClient(clientId)
    const [editing, setEditing] = useState(null) // { id, current }
    const [text, setText] = useState('')

    // Photos (base64 images) are only downloaded once this tab is opened.
    const photosRes = useAsyncData(() => fetchForClient(clientId), [clientId, fetchForClient])
    const hasLoaded = loadedFor === String(clientId)

    if (photosRes.loading && !hasLoaded) return <Skeleton active paragraph={{ rows: 5 }} />
    if (photosRes.error && !hasLoaded) {
        return <SectionError title="Couldn't load photos" error={photosRes.error} onRetry={photosRes.reload} />
    }

    if (groups.length === 0) {
        return (
            <div className="app-card">
                <EmptyState title="No progress photos yet" description={`${clientName} hasn't shared any photos.`} />
            </div>
        )
    }

    const openEditor = (photo) => {
        setEditing({ id: photo.id, hasNote: !!photo.note })
        setText(photo.note || '')
    }

    const save = () => {
        if (!text.trim()) {
            if (editing.hasNote) clearNote(editing.id)
        } else {
            setNote(editing.id, text)
        }
        message.success('Note saved')
        setEditing(null)
    }

    return (
        <div className="flex flex-col gap-6">
            {groups.map((group) => (
                <div key={group.date}>
                    <div className="mb-2 text-sm font-semibold text-text-secondary">
                        {dayjs(group.date).format('ddd, D MMM YYYY')}
                    </div>
                    <Image.PreviewGroup>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {group.items.map((p) => (
                                <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                                    <div className="bg-black/5" style={{ aspectRatio: '3 / 4' }}>
                                        <Image
                                            src={p.dataUrl || p.image}
                                            alt={progressPhotoAngleLabels[p.angle] || 'Progress photo'}
                                            wrapperClassName="!block h-full w-full"
                                            className="!h-full !w-full !object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-2 p-3">
                                        <Tag bordered={false} style={{ borderRadius: 999, width: 'fit-content' }}>
                                            {progressPhotoAngleLabels[p.angle] || p.angle}
                                        </Tag>
                                        {p.caption && <p className="m-0 text-sm text-text-secondary">{p.caption}</p>}
                                        {p.note ? (
                                            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                                                <span className="font-semibold text-text-secondary">Your note: </span>
                                                <span className="text-text-secondary">{p.note}</span>
                                                <button
                                                    className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary"
                                                    onClick={() => openEditor(p)}
                                                >
                                                    <EditOutlined /> Edit note
                                                </button>
                                            </div>
                                        ) : (
                                            <Button size="small" icon={<EditOutlined />} onClick={() => openEditor(p)}>
                                                Add note
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Image.PreviewGroup>
                </div>
            ))}

            <Modal
                title="Note on this photo"
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={save}
                okText="Save note"
                centered
            >
                <p className="mb-2 text-sm text-text-secondary">
                    {clientName} will see this under the photo. Leave it empty to remove the note.
                </p>
                <Input.TextArea
                    rows={4}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What do you want them to know about this shot?"
                />
            </Modal>
        </div>
    )
}

// Correction requests this client has sent. The full request list is only fetched
// when this tab is opened (the tab label uses a cheap count instead).
function RequestsTab({ clientId, clientName, navigate }) {
    const { requests, loading, error, reload } = useCorrections()
    const clientRequests = requests.filter((r) => r.clientId === clientId || String(r.client) === clientId)

    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />
    if (error) return <SectionError title="Couldn't load requests" error={error} onRetry={reload} />

    return clientRequests.length === 0 ? (
        <div className="app-card">
            <EmptyState title="No correction requests" description={`${clientName} hasn't asked for any changes.`} />
        </div>
    ) : (
        <div className="flex flex-col gap-3">
            {clientRequests.map((r) => (
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
                                <span className="text-xs text-text-muted">· {dayjs(r.createdAt).format('D MMM, h:mm A')}</span>
                            </div>
                            {r.item && <div className="mt-1 text-sm font-medium text-text-secondary">{r.item}</div>}
                            <p className="mt-1 mb-0 text-sm text-text-secondary">{r.note}</p>
                            {r.reply && (
                                <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                                    <span className="font-semibold text-text-secondary">Your reply: </span>
                                    <span className="text-text-secondary">{r.reply}</span>
                                </div>
                            )}
                        </div>
                        <StatusBadge status={r.status} />
                    </div>
                </div>
            ))}
            <Button type="primary" onClick={() => navigate('/requests')}>Manage requests</Button>
        </div>
    )
}

export default function ClientProfile() {
    const { message } = App.useApp()
    const { id } = useParams()
    const navigate = useNavigate()
    // ?tab=diet&date=YYYY-MM-DD deep-links here from the Requests page.
    const [searchParams] = useSearchParams()
    const { primary } = useTheme()
    // Corrections are read without loading the full list (that happens when the
    // Requests tab opens) — until then a cheap per-client count feeds the tab label.
    const { requests, loaded: correctionsLoaded } = useCorrections({ load: false })
    const { pendingCountForClient, loadedFor: photosLoadedFor } = useProgressPhotos()
    const [goalModal, setGoalModal] = useState(null) // { type: 'water' | 'sleep', value }
    const [goalSaving, setGoalSaving] = useState(false)
    const [expandedSession, setExpandedSession] = useState(null) // sessionId

    // Each tab loads its own data the first time it's opened, so the page only
    // waits on the client record and never fetches what nobody looks at.
    const [visited, setVisited] = useState(() => new Set([searchParams.get('tab') || 'overview']))
    const seen = (tab) => visited.has(tab)
    const onTabChange = (key) => setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))

    const clientRes = useAsyncData(() => orNullOn404(api.get(`/clients/${id}`)), [id])
    const clientData = clientRes.data
    const setClientData = clientRes.setData
    const loading = clientRes.loading

    const weightRes = useAsyncData(() => api.get(`/progress/weight?client=${id}`), [id], { enabled: seen('overview') })
    const weightData = useMemo(
        () => (weightRes.data?.items || []).map((e) => ({ date: dayjs(e.date).format('D MMM'), weight: e.weightKg, source: e.source })),
        [weightRes.data],
    )
    const dietRes = useAsyncData(() => orNullOn404(api.get(`/clients/${id}/diet-plan`)), [id], { enabled: seen('diet') })
    const dietPlan = dietRes.data
    const exercisePlanRes = useAsyncData(() => orNullOn404(api.get(`/clients/${id}/exercise-plan`)), [id], { enabled: seen('exercise') })
    const exercisePlan = exercisePlanRes.data
    const sessionsRes = useAsyncData(() => api.get(`/workout-sessions?client=${id}&limit=10`), [id], { enabled: seen('exercise') })
    const workoutSessions = sessionsRes.data?.items || []
    const adherenceRes = useAsyncData(() => api.get(`/clients/${id}/workout-adherence?weeks=6`), [id], { enabled: seen('exercise') })
    const workoutAdherence = adherenceRes.data
    const followUpsRes = useAsyncData(() => api.get(`/followups?client=${id}`), [id], { enabled: seen('followups') })
    const followUps = followUpsRes.data?.items || []

    const photoSummary = useAsyncData(() => api.get(`/progress-photos?client=${id}&summary=1`), [id])
    const requestSummary = useAsyncData(() => api.get(`/corrections?client=${id}&summary=1`), [id])
    const pendingPhotos = photosLoadedFor === String(id) ? pendingCountForClient(id) : (photoSummary.data?.pendingReview ?? 0)
    const openRequests = correctionsLoaded
        ? requests.filter((r) => (r.clientId === id || String(r.client) === id) && r.status === 'open').length
        : (requestSummary.data?.openCount ?? 0)

    if (loading) return <LoadingSkeleton cards={4} rows={6} />

    if (clientRes.error) {
        return (
            <div className="app-card">
                <SectionError title="Couldn't load this client" error={clientRes.error} onRetry={clientRes.reload} />
            </div>
        )
    }

    if (!clientData) {
        return (
            <div className="app-card">
                <EmptyState
                    title="Client not found"
                    description="This client may have been removed."
                    action={<Button type="primary" onClick={() => navigate('/clients')}>Back to clients</Button>}
                />
            </div>
        )
    }

    // Alias for all below references
    const client = clientData
    const nextFollowUpLabel = client.nextFollowUp ? dayjs(client.nextFollowUp).format('D MMM YYYY') : 'Not scheduled'

    const overview = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-4">Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><MailOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.email}</span></div>
                    <div className="flex items-center gap-3"><PhoneOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.phone}</span></div>
                    <div className="flex items-center gap-3"><AimOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Goal: {client.goal}</span></div>
                    <div className="flex items-center gap-3"><CalendarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Next follow-up: {nextFollowUpLabel}</span></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="text-lg font-extrabold text-text-primary">{client.weight}kg</div>
                        <div className="text-[11px] text-text-muted">Current</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="text-lg font-extrabold text-text-primary">{client.target}kg</div>
                        <div className="text-[11px] text-text-muted">Target</div>
                    </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                        className="rounded-xl p-3 text-left transition-colors hover:opacity-80"
                        style={{ background: 'var(--color-surface-secondary)' }}
                        onClick={() => setGoalModal({ type: 'water', value: client.waterGoal ?? 2 })}
                    >
                        <div className="text-lg font-extrabold text-text-primary">{client.waterGoal ?? 2}L</div>
                        <div className="text-[11px] text-text-muted">Daily water goal</div>
                    </button>
                    <button
                        className="rounded-xl p-3 text-left transition-colors hover:opacity-80"
                        style={{ background: 'var(--color-surface-secondary)' }}
                        onClick={() => setGoalModal({ type: 'sleep', value: client.sleepGoal ?? 8 })}
                    >
                        <div className="text-lg font-extrabold text-text-primary">{client.sleepGoal ?? 8}h</div>
                        <div className="text-[11px] text-text-muted">Daily sleep goal</div>
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2">
                <ChartCard title="Weight Progress" subtitle={weightRes.loading ? 'Loading…' : `${weightData.length} weigh-ins (kg)`}>
                    {weightRes.loading ? (
                        <Skeleton active paragraph={{ rows: 7 }} title={false} />
                    ) : weightRes.error ? (
                        <SectionError title="Couldn't load weight history" error={weightRes.error} onRetry={weightRes.reload} />
                    ) : weightData.length === 0 ? (
                        <div className="flex h-[260px] items-center justify-center text-sm text-text-muted">No weight entries yet</div>
                    ) : (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={weightData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null
                                    const d = payload[0].payload
                                    return (
                                        <div className="rounded-lg border px-3 py-2 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                            <div className="text-xs font-semibold text-text-primary">{label}: {d.weight} kg</div>
                                            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
                                                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: d.source === 'client' ? 'var(--color-info)' : primary }} />
                                                {d.source === 'client' ? 'Logged by client' : 'Logged by you'}
                                            </div>
                                        </div>
                                    )
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="weight"
                                name="Weight"
                                stroke={primary}
                                strokeWidth={2.5}
                                dot={(props) => {
                                    const { cx, cy, payload } = props
                                    const isClient = payload.source === 'client'
                                    return (
                                        <circle
                                            key={props.key}
                                            cx={cx}
                                            cy={cy}
                                            r={isClient ? 4 : 3}
                                            fill={isClient ? 'var(--color-info)' : primary}
                                            stroke="#fff"
                                            strokeWidth={isClient ? 2 : 1}
                                        />
                                    )
                                }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    )}
                    {weightData.length > 0 && (
                    <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-info)' }} /> Client logged</span>
                        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: primary }} /> Trainer logged</span>
                    </div>
                    )}
                </ChartCard>
            </div>
        </div>
    )

    const dietTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">
                    {dietRes.loading ? (
                        <Skeleton.Input active size="small" style={{ width: 200 }} />
                    ) : dietRes.error ? (
                        <>Couldn't load diet plan <Button type="link" size="small" onClick={dietRes.reload}>Retry</Button></>
                    ) : (
                        dietPlan?.title || 'No diet plan'
                    )}
                </h3>
                <Button type="primary" onClick={() => navigate('/diet-plans')}>Edit plan</Button>
            </div>

            <DietDayProgress clientId={id} initialDate={searchParams.get('date')} />

            <div className="mt-6">
                <GlucoseChart clientId={id} />
            </div>
        </div>
    )

    const exerciseTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">
                    {exercisePlanRes.loading ? (
                        <Skeleton.Input active size="small" style={{ width: 200 }} />
                    ) : exercisePlanRes.error ? (
                        <>Couldn't load exercise plan <Button type="link" size="small" onClick={exercisePlanRes.reload}>Retry</Button></>
                    ) : (
                        exercisePlan?.title || 'No exercise plan'
                    )}
                </h3>
                <Button type="primary" onClick={() => navigate('/exercise-plans')}>Edit plan</Button>
            </div>
            {exercisePlanRes.loading && <Skeleton active paragraph={{ rows: 3 }} />}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {(exercisePlan?.days || []).map((d) => (
                    <ExerciseDayCard key={d.id} day={d} />
                ))}
            </div>

            <div className="mt-6">
                <h3 className="section-title mb-3">Workout History &amp; Performance</h3>

                {adherenceRes.loading ? (
                    <Skeleton active paragraph={{ rows: 2 }} className="mb-4" />
                ) : adherenceRes.error ? (
                    <SectionError title="Couldn't load workout adherence" error={adherenceRes.error} onRetry={adherenceRes.reload} className="mb-4" />
                ) : (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="app-card p-4 text-center">
                        <div className="text-2xl font-extrabold" style={{ color: 'var(--color-success)' }}>{workoutAdherence?.totals?.completed ?? 0}</div>
                        <div className="text-sm font-semibold text-text-primary">Completed</div>
                        <div className="text-xs text-text-muted">last 6 weeks</div>
                    </div>
                    <div className="app-card p-4 text-center">
                        <div className="text-2xl font-extrabold" style={{ color: 'var(--color-warning)' }}>{workoutAdherence?.totals?.partial ?? 0}</div>
                        <div className="text-sm font-semibold text-text-primary">Partial</div>
                        <div className="text-xs text-text-muted">last 6 weeks</div>
                    </div>
                    <div className="app-card p-4 text-center">
                        <div className="text-2xl font-extrabold" style={{ color: 'var(--color-danger)' }}>{workoutAdherence?.totals?.missed ?? 0}</div>
                        <div className="text-sm font-semibold text-text-primary">Missed</div>
                        <div className="text-xs text-text-muted">last 6 weeks</div>
                    </div>
                </div>
                )}

                {workoutAdherence?.weeklyBreakdown?.length > 0 && (
                    <ChartCard title="Weekly Adherence" subtitle="Last 6 weeks (%)" className="mb-4">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={workoutAdherence.weeklyBreakdown.map((w) => ({ week: dayjs(w.weekStart).format('D MMM'), adherencePct: w.adherencePct }))} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip content={<ChartTooltip />} />
                                <Bar dataKey="adherencePct" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}

                {sessionsRes.loading ? (
                    <Skeleton active paragraph={{ rows: 4 }} />
                ) : sessionsRes.error ? (
                    <SectionError title="Couldn't load workout sessions" error={sessionsRes.error} onRetry={sessionsRes.reload} />
                ) : workoutSessions.length === 0 ? (
                    <Empty description="No workout sessions logged yet" className="py-6" />
                ) : (
                    <Collapse
                        accordion
                        activeKey={expandedSession}
                        onChange={(key) => setExpandedSession(key)}
                        items={workoutSessions.map((s) => ({
                            key: s._id || s.id,
                            label: (
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold text-text-primary">
                                        {dayjs(s.date).format('ddd, D MMM')} — {s.day}{s.focus ? ` · ${s.focus}` : ''}
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Tag color={s.status === 'completed' ? 'success' : 'processing'}>{s.status === 'completed' ? 'Completed' : 'In progress'}</Tag>
                                        <span className="text-xs text-text-muted">{s.doneSets}/{s.totalSets} sets · {s.completionPct}%</span>
                                    </span>
                                </div>
                            ),
                            children: (
                                <div className="flex flex-col gap-3">
                                    {(s.exercises || []).map((ex, exi) => (
                                        <div key={exi} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-sm font-semibold text-text-primary">{ex.name}</span>
                                                <span className="text-xs text-text-muted">{ex.doneSets}/{ex.totalSets} sets</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-left text-text-muted">
                                                            <th className="pr-3 font-medium">Set</th>
                                                            <th className="pr-3 font-medium">Target</th>
                                                            <th className="pr-3 font-medium">Actual</th>
                                                            <th className="font-medium">Done</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(ex.sets || []).map((set, si) => (
                                                            <tr key={si} className="text-text-secondary">
                                                                <td className="pr-3 py-0.5">{set.setNumber}</td>
                                                                <td className="pr-3 py-0.5">
                                                                    {ex.trackingType === 'duration'
                                                                        ? `${set.targetDuration ?? '—'}s`
                                                                        : `${set.targetReps}${set.targetWeight ? ` @ ${set.targetWeight}kg` : ''}`}
                                                                </td>
                                                                <td className="pr-3 py-0.5">
                                                                    {ex.trackingType === 'duration'
                                                                        ? `${set.actualDuration ?? '—'}s`
                                                                        : `${set.actualReps ?? '—'}${set.actualWeight ? ` @ ${set.actualWeight}kg` : ''}`}
                                                                </td>
                                                                <td className="py-0.5">{set.completed ? '✓' : '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {ex.notes && <div className="mt-1 text-xs italic text-text-secondary">{ex.notes}</div>}
                                        </div>
                                    ))}
                                    {s.notes && <div className="text-xs italic text-text-secondary">Client note: {s.notes}</div>}
                                </div>
                            ),
                        }))}
                    />
                )}
            </div>
        </div>
    )

    const progressTab = <HabitHistory clientId={id} />

    const followUpTagColor = { completed: 'green', overdue: 'red', today: 'blue', missed: 'default', upcoming: 'orange' }
    // Open ones first (soonest first), then finished ones newest-first.
    const sortedFollowUps = [...followUps].sort((a, b) => {
        const aOpen = a.status === 'scheduled'
        const bOpen = b.status === 'scheduled'
        if (aOpen !== bOpen) return aOpen ? -1 : 1
        return aOpen ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
    })

    const followUpTab = (
        <div className="app-card p-6">
            <h3 className="section-title mb-4">Follow-up history</h3>
            {followUpsRes.loading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
            ) : followUpsRes.error ? (
                <SectionError title="Couldn't load follow-ups" error={followUpsRes.error} onRetry={followUpsRes.reload} />
            ) : sortedFollowUps.length === 0 ? (
                <EmptyState title="No follow-ups yet" description={`Schedule a check-in with ${client.name}.`} />
            ) : (
                <div className="flex flex-col gap-3">
                    {sortedFollowUps.map((f) => (
                        <div key={f.id} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary">
                                    {dayjs(f.date).format('ddd, D MMM YYYY')}{f.time ? ` · ${formatTime(f.time)}` : ''}
                                </div>
                                <div className="text-xs text-text-muted">{FOLLOWUP_TYPE_LABELS[f.type] || f.type}{f.note ? ` · ${f.note}` : ''}</div>
                                {f.outcome && <div className="mt-1 text-xs text-text-secondary">Outcome: {f.outcome}</div>}
                            </div>
                            <Tag color={followUpTagColor[f.bucket]} className="m-0 capitalize">{f.bucket}</Tag>
                        </div>
                    ))}
                </div>
            )}
            <div className="mt-4 flex gap-2">
                <Button type="primary" onClick={() => navigate(`/follow-ups?new=${id}`)}>Schedule follow-up</Button>
                <Button onClick={() => navigate('/follow-ups')}>Manage follow-ups</Button>
            </div>
        </div>
    )

    const requestsTab = <RequestsTab clientId={id} clientName={client.name} navigate={navigate} />

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>
                Back to clients
            </Button>

            <div className="app-card mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={client.name} color={client.avatarColor} size={64} />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="m-0 text-xl font-extrabold text-text-primary md:text-2xl">{client.name}</h1>
                                <StatusBadge status={client.status} />
                            </div>
                            <div className="mt-1 text-sm text-text-muted">{client.goal} · {client.plan} plan</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button icon={<MessageOutlined />} onClick={() => navigate('/messages')}>Message</Button>
                        <Button type="primary" onClick={() => navigate(`/follow-ups?new=${id}`)}>Schedule follow-up</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard icon={<LineChartOutlined />} label="Progress" value={`${client.progress}%`} accent="var(--color-success)" />
                <StatCard icon={<DashboardOutlined />} label="Current Weight" value={`${client.weight}kg`} hint={`Target ${client.target}kg`} />
                <StatCard icon={<CrownOutlined />} label="Plan" value={client.plan} />
                <StatCard icon={<CalendarOutlined />} label="Next Follow-up" value={nextFollowUpLabel} />
            </div>

            <div className="mt-6">
                <Tabs
                    defaultActiveKey={searchParams.get('tab') || 'overview'}
                    onChange={onTabChange}
                    items={[
                        { key: 'overview', label: 'Overview', children: overview },
                        { key: 'diet', label: 'Diet Plan', children: dietTab },
                        { key: 'exercise', label: 'Exercise Plan', children: exerciseTab },
                        { key: 'progress', label: 'Progress', children: progressTab },
                        {
                            key: 'photos',
                            label: `Photos${pendingPhotos ? ` (${pendingPhotos})` : ''}`,
                            children: <PhotosTab clientId={id} clientName={client.name} />,
                        },
                        { key: 'followups', label: 'Follow-ups', children: followUpTab },
                        {
                            key: 'requests',
                            label: `Requests${openRequests ? ` (${openRequests})` : ''}`,
                            children: requestsTab,
                        },
                    ]}
                />
            </div>

            <Modal
                title={goalModal?.type === 'water' ? 'Set daily water goal' : 'Set daily sleep goal'}
                open={!!goalModal}
                onCancel={() => { if (!goalSaving) setGoalModal(null) }}
                onOk={async () => {
                    if (!goalModal) return
                    setGoalSaving(true)
                    const field = goalModal.type === 'water' ? 'waterGoal' : 'sleepGoal'
                    try {
                        const updated = await api.patch(`/clients/${id}`, { [field]: goalModal.value })
                        setClientData(updated)
                        message.success(`${goalModal.type === 'water' ? 'Water' : 'Sleep'} goal updated`)
                        setGoalModal(null)
                    } catch { message.error('Failed to update') }
                    finally { setGoalSaving(false) }
                }}
                confirmLoading={goalSaving}
                okText="Save"
                centered
                destroyOnClose
            >
                {goalModal && (
                    <div className="mt-4">
                        <label className="mb-2 block text-sm font-medium text-text-secondary">
                            {goalModal.type === 'water' ? 'Water intake (litres)' : 'Sleep duration (hours)'}
                        </label>
                        <InputNumber
                            value={goalModal.value}
                            onChange={(v) => setGoalModal((prev) => ({ ...prev, value: v }))}
                            min={goalModal.type === 'water' ? 0.5 : 4}
                            max={goalModal.type === 'water' ? 10 : 12}
                            step={0.5}
                            precision={1}
                            className="!w-full"
                            size="large"
                            autoFocus
                        />
                        <p className="mt-2 text-xs text-text-muted">
                            {goalModal.type === 'water'
                                ? 'Recommended: 2–3L for most adults. This will appear as a daily task for your client.'
                                : 'Recommended: 7–9 hours for most adults. This will appear as a daily task for your client.'}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    )
}
