import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { Button, Tabs, Progress, Checkbox, Tag, Image, Input, InputNumber, Modal, App, Collapse, Empty } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    PhoneOutlined,
    AimOutlined,
    MessageOutlined,
    CalendarOutlined,
    EditOutlined,
    FireOutlined,
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
    Cell,
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
import MealCard from '../components/MealCard'
import ExerciseDayCard from '../components/ExerciseDayCard'
import { api } from '../../../services/api'

const correctionAreaLabels = { diet: 'Diet plan', exercise: 'Exercise plan', progress: 'Progress / weigh-in', general: 'General' }
const correctionTypeLabels = { swap: 'Swap / substitute', 'too-hard': 'Too difficult', injury: 'Injury / pain', 'wrong-data': 'Wrong data', other: 'Other' }
const progressPhotoAngleLabels = { front: 'Front', side: 'Side', back: 'Back', other: 'Other' }

// Photos one client has shared, with an inline editor for the trainer's per-photo note.
function PhotosTab({ clientId, clientName }) {
    const { message } = App.useApp()
    const { photosForClient, fetchForClient, setNote, clearNote } = useProgressPhotos()
    const groups = photosForClient(clientId)
    const [editing, setEditing] = useState(null) // { id, current }
    const [text, setText] = useState('')

    useEffect(() => {
        fetchForClient(clientId)
    }, [clientId, fetchForClient])

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
                                            src={p.dataUrl}
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

export default function ClientProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { primary } = useTheme()
    const { requests } = useCorrections()
    const { pendingCountForClient, fetchForClient: fetchPhotos } = useProgressPhotos()
    const [clientData, setClientData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [weightData, setWeightData] = useState([])
    const [dietPlan, setDietPlan] = useState(null)
    const [exercisePlan, setExercisePlan] = useState(null)
    const [todayCheats, setTodayCheats] = useState([])
    const [todayMealStatus, setTodayMealStatus] = useState({}) // { [mealId]: boolean }
    const [todayMealItems, setTodayMealItems] = useState({}) // { [mealId]: boolean[] } — per-item completion
    const [habitHistory, setHabitHistory] = useState([])
    const [habitGoals, setHabitGoals] = useState({ waterGoal: 2, sleepGoal: 8 })
    const [goalModal, setGoalModal] = useState(null) // { type: 'water' | 'sleep', value }
    const [goalSaving, setGoalSaving] = useState(false)
    const [workoutSessions, setWorkoutSessions] = useState([])
    const [workoutAdherence, setWorkoutAdherence] = useState(null)
    const [expandedSession, setExpandedSession] = useState(null) // sessionId
    const clientRequests = requests.filter((r) => r.clientId === id || String(r.client) === id)
    const pendingPhotos = pendingCountForClient(id)

    useEffect(() => {
        let cancelled = false
        async function load() {
            setLoading(true)
            fetchPhotos(id)
            // All six independent — fire them together instead of one long
            // waterfall of sequential awaits (each one adding its own round-trip
            // latency on top of the last, which is what made this page feel slow).
            const [clientRes, weightRes, dietRes, exRes, dailyRes, historyRes, sessionsRes, adherenceRes] = await Promise.allSettled([
                api.get(`/clients/${id}`),
                api.get(`/progress/weight?client=${id}`),
                api.get(`/clients/${id}/diet-plan`),
                api.get(`/clients/${id}/exercise-plan`),
                api.get(`/progress/daily?client=${id}`),
                api.get(`/progress/daily/history?client=${id}&days=14`),
                api.get(`/workout-sessions?client=${id}&limit=10`),
                api.get(`/clients/${id}/workout-adherence?weeks=6`),
            ])
            if (cancelled) return

            if (clientRes.status === 'fulfilled') setClientData(clientRes.value)

            if (weightRes.status === 'fulfilled') {
                const w = weightRes.value
                setWeightData((w.items || []).map((e) => ({ date: dayjs(e.date).format('D MMM'), weight: e.weightKg, source: e.source })))
            }

            if (dietRes.status === 'fulfilled' && dietRes.value) setDietPlan(dietRes.value)
            if (exRes.status === 'fulfilled' && exRes.value) setExercisePlan(exRes.value)

            if (dailyRes.status === 'fulfilled') {
                const daily = dailyRes.value
                setTodayCheats(daily.cheats || [])
                const mStatus = {}
                const mItems = {}
                    ; (daily.tasks || []).filter((t) => t.type === 'meal').forEach((t) => {
                        mStatus[String(t.mealId)] = t.done
                        mItems[String(t.mealId)] = t.itemsDone || []
                    })
                setTodayMealStatus(mStatus)
                setTodayMealItems(mItems)
            }

            if (historyRes.status === 'fulfilled') {
                const h = historyRes.value
                setHabitHistory((h.history || []).map((d) => ({
                    date: dayjs(d.date).format('DD MMM'),
                    completionPct: d.completionPct,
                    water: d.water,
                    sleep: d.sleep,
                    workout: d.workout,
                    mealsDone: d.mealsDone,
                    mealsTotal: d.mealsTotal,
                    mealItemsDone: d.mealItemsDone,
                    mealItemsTotal: d.mealItemsTotal,
                })))
                if (h.goals) setHabitGoals(h.goals)
            }

            if (sessionsRes.status === 'fulfilled') setWorkoutSessions(sessionsRes.value.items || [])
            if (adherenceRes.status === 'fulfilled') setWorkoutAdherence(adherenceRes.value)

            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [id, fetchPhotos])

    const completion = useMemo(() => {
        if (!habitHistory.length) return 0
        return Math.round(habitHistory.reduce((s, d) => s + d.completionPct, 0) / habitHistory.length)
    }, [habitHistory])

    const habitStats = useMemo(() => {
        const total = habitHistory.length || 1
        const waterDone = habitHistory.filter((d) => d.water).length
        const sleepDone = habitHistory.filter((d) => d.sleep).length
        const workoutDone = habitHistory.filter((d) => d.workout).length
        return {
            waterPct: Math.round((waterDone / total) * 100),
            sleepPct: Math.round((sleepDone / total) * 100),
            workoutPct: Math.round((workoutDone / total) * 100),
            waterDone, sleepDone, workoutDone, total: habitHistory.length,
        }
    }, [habitHistory])

    if (loading) return <LoadingSkeleton cards={4} rows={6} />

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

    const overview = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-4">Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><MailOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.email}</span></div>
                    <div className="flex items-center gap-3"><PhoneOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.phone}</span></div>
                    <div className="flex items-center gap-3"><AimOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Goal: {client.goal}</span></div>
                    <div className="flex items-center gap-3"><CalendarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Next follow-up: {client.nextFollowUp}</span></div>
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
                <ChartCard title="Weight Progress" subtitle="Recent weigh-ins (kg)">
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
                    <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--color-info)' }} /> Client logged</span>
                        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: primary }} /> Trainer logged</span>
                    </div>
                </ChartCard>
            </div>
        </div>
    )

    const todayDietDay = (dietPlan?.days || []).find((d) => (d.id || d._id) === dietPlan?.resolvedTodayDayId) || dietPlan?.days?.[0]
    const todayDietMeals = todayDietDay?.meals || []
    // Only count completion for meals still on today's plan — todayMealStatus
    // can carry stale entries for meals the trainer has since edited/removed,
    // which would otherwise inflate the count past the plan's current total.
    const dietMealsDone = todayDietMeals.filter((m) => todayMealStatus[String(m._id || m.id)]).length
    const dietMealsTotal = todayDietMeals.length
    const dietAdherence = dietMealsTotal ? Math.round((dietMealsDone / dietMealsTotal) * 100) : 0

    const dietTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">{dietPlan?.title || 'No diet plan'}</h3>
                <Button type="primary" onClick={() => navigate('/diet-plans')}>Edit plan</Button>
            </div>

            {dietMealsTotal > 0 && (
                <div className="app-card mb-4 p-4">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold text-text-secondary">Today's diet adherence</span>
                        <span className="font-bold text-text-primary">{dietMealsDone}/{dietMealsTotal} meals · {dietAdherence}%</span>
                    </div>
                    <Progress percent={dietAdherence} strokeColor={dietAdherence === 100 ? 'var(--color-success)' : 'var(--color-primary)'} />
                </div>
            )}

            {todayCheats.length > 0 && (
                <div className="app-card mb-4 p-4" style={{ borderLeft: '3px solid var(--color-warning)' }}>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--color-warning)' }}>
                        <FireOutlined /> {todayCheats.length} cheat {todayCheats.length === 1 ? 'meal' : 'meals'} today
                    </div>
                    <div className="flex flex-col gap-2">
                        {todayCheats.map((c) => (
                            <div key={String(c._id || c.mealId)} className="rounded-lg p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                <div className="text-sm font-semibold text-text-primary">{c.mealName || 'Meal'}</div>
                                {c.note && <div className="mt-0.5 text-sm text-text-secondary">{c.note}</div>}
                                {c.items?.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {c.items.map((item, i) => (
                                            <span key={i} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                                {item}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {todayDietMeals.map((m) => (
                    <MealCard
                        key={m.id}
                        meal={m}
                        cheat={todayCheats.find((c) => String(c.mealId) === String(m.id))}
                        done={todayMealStatus[String(m._id || m.id)]}
                        itemsDone={todayMealItems[String(m._id || m.id)]}
                    />
                ))}
            </div>
        </div>
    )

    const exerciseTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">{exercisePlan?.title || 'No exercise plan'}</h3>
                <Button type="primary" onClick={() => navigate('/exercise-plans')}>Edit plan</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {(exercisePlan?.days || []).map((d) => (
                    <ExerciseDayCard key={d.id} day={d} />
                ))}
            </div>

            <div className="mt-6">
                <h3 className="section-title mb-3">Workout History &amp; Performance</h3>

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

                {workoutSessions.length === 0 ? (
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

    const progressTab = (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--color-info)' }}>{habitStats.waterPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Water</div>
                    <div className="text-xs text-text-muted">{habitStats.waterDone}/{habitStats.total} days — Goal: {habitGoals.waterGoal}L</div>
                </div>
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: '#7c3aed' }}>{habitStats.sleepPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Sleep</div>
                    <div className="text-xs text-text-muted">{habitStats.sleepDone}/{habitStats.total} days — Goal: {habitGoals.sleepGoal}h</div>
                </div>
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{habitStats.workoutPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Workout</div>
                    <div className="text-xs text-text-muted">{habitStats.workoutDone}/{habitStats.total} days</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Daily Completion" subtitle="Last 14 days (%)">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={habitHistory} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={40} />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null
                                    const d = payload[0].payload
                                    return (
                                        <div className="rounded-lg border px-3 py-2 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                            <div className="text-xs font-semibold text-text-primary">{label} — {d.completionPct}%</div>
                                            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-text-muted">
                                                <span>{d.water ? '✅' : '❌'} Water</span>
                                                <span>{d.sleep ? '✅' : '❌'} Sleep</span>
                                                <span>{d.workout ? '✅' : '❌'} Workout</span>
                                                <span>🍽️ Meals: {d.mealsDone}/{d.mealsTotal} ({d.mealItemsDone}/{d.mealItemsTotal} items)</span>
                                            </div>
                                        </div>
                                    )
                                }}
                            />
                            <Bar dataKey="completionPct" name="Completion" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {habitHistory.map((e, i) => (
                                    <Cell key={i} fill={e.completionPct >= 80 ? 'var(--color-success)' : e.completionPct >= 50 ? primary : 'var(--color-warning)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Today's Checklist" subtitle={`${completion}% avg. completion`}>
                    <div className="mb-3">
                        <Progress percent={completion} strokeColor="var(--color-primary)" />
                    </div>
                    <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
                        {habitHistory.length > 0 && (() => {
                            const latest = habitHistory[habitHistory.length - 1]
                            const items = [
                                { label: 'Water intake', done: latest.water },
                                { label: 'Sleep goal', done: latest.sleep },
                                { label: 'Workout', done: latest.workout },
                                { label: `Meals (${latest.mealsDone}/${latest.mealsTotal})`, done: latest.mealsDone === latest.mealsTotal && latest.mealsTotal > 0 },
                            ]
                            return items.map((t, i) => (
                                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                                    <Checkbox checked={t.done} disabled />
                                    <span className={`text-sm ${t.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{t.label}</span>
                                </div>
                            ))
                        })()}
                    </div>
                </ChartCard>
            </div>
        </div>
    )

    const followUpTab = (
        <div className="app-card p-6">
            <h3 className="section-title mb-4">Follow-up history</h3>
            <div className="flex flex-col gap-3">
                {[
                    { date: client.lastFollowUp, note: 'Reviewed weekly progress, adjusted calories.', status: 'completed' },
                    { date: client.nextFollowUp, note: 'Upcoming check-in.', status: client.followUp < 0 ? 'overdue' : 'pending' },
                ].map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div>
                            <div className="text-sm font-semibold text-text-primary">{f.date}</div>
                            <div className="text-xs text-text-muted">{f.note}</div>
                        </div>
                        <Tag color={f.status === 'completed' ? 'green' : f.status === 'overdue' ? 'red' : 'orange'}>{f.status}</Tag>
                    </div>
                ))}
            </div>
            <Button type="primary" className="mt-4" onClick={() => navigate('/follow-ups')}>Manage follow-ups</Button>
        </div>
    )

    const requestsTab =
        clientRequests.length === 0 ? (
            <div className="app-card">
                <EmptyState title="No correction requests" description={`${client.name} hasn't asked for any changes.`} />
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
                                    <span className="text-xs text-text-muted">· {r.createdAt}</span>
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
                        <Button type="primary" onClick={() => navigate('/follow-ups')}>Schedule follow-up</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Progress" value={`${client.progress}%`} accent="var(--color-success)" />
                <StatCard label="Current Weight" value={`${client.weight}kg`} hint={`Target ${client.target}kg`} />
                <StatCard label="Plan" value={client.plan} />
                <StatCard label="Next Follow-up" value={client.nextFollowUp} />
            </div>

            <div className="mt-6">
                <Tabs
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
                            label: `Requests${clientRequests.filter((r) => r.status === 'open').length ? ` (${clientRequests.filter((r) => r.status === 'open').length})` : ''}`,
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
