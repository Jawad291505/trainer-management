import { useState, useEffect, useMemo } from 'react'
import { Button, Modal, InputNumber, DatePicker, Segmented, App } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
    ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Cell,
} from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import ProgressPhotos from '../components/ProgressPhotos'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import ProgressRing from '../components/ProgressRing'
import GlucoseChart from '../../../components/progress/GlucoseChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { api } from '../../../services/api'
import { formatPkt } from '../../../utils/pkt'

// Inline empty/error placeholder for a chart or section that has nothing to show.
function SectionMessage({ text, onRetry, height = 240 }) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-text-muted" style={{ minHeight: height }}>
            <span>{text}</span>
            {onRetry && <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>Retry</Button>}
        </div>
    )
}

const fmtKg = (v) => (v == null ? '—' : `${v}kg`)
const pctFill = (pct) => (pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)')

export default function MyProgress() {
    const { primary } = useTheme()
    const { message } = App.useApp()
    const { client } = useAuth()

    const [loading, setLoading] = useState(true)
    const [weightEntries, setWeightEntries] = useState([])
    const [weightSummary, setWeightSummary] = useState(null)
    const [errors, setErrors] = useState({}) // per-section load failures: { weight, habits, completion }
    const [completion, setCompletion] = useState(null)
    const [habitHistory, setHabitHistory] = useState([])
    const [habitsLoading, setHabitsLoading] = useState(false)
    const [habitGoals, setHabitGoals] = useState({ waterGoal: 2, sleepGoal: 8 })
    const [habitDays, setHabitDays] = useState(14)
    const [adherence, setAdherence] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [newWeight, setNewWeight] = useState(null)
    const [newDate, setNewDate] = useState(dayjs())
    const [saving, setSaving] = useState(false)

    const setError = (key, message) => setErrors((e) => ({ ...e, [key]: message }))

    const applyWeight = (w) => {
        setWeightEntries((w.items || []).map((e) => ({ date: formatPkt(e.date, 'D MMM'), weight: e.weightKg })))
        setWeightSummary(w.summary || null)
    }

    const loadWeight = async () => {
        try {
            applyWeight(await api.get('/progress/weight'))
            setError('weight', null)
        } catch (err) { setError('weight', err.message || 'Could not load your weight history') }
    }

    const loadCompletion = async () => {
        try {
            setCompletion(await api.get('/stats/client/completion?days=7'))
            setError('completion', null)
        } catch (err) { setError('completion', err.message || 'Could not load weekly consistency') }
    }

    const loadHabits = async (days) => {
        setHabitsLoading(true)
        try {
            const h = await api.get(`/progress/daily/history?days=${days}`)
            setHabitHistory(
                (h.history || []).map((d) => ({
                    ...d,
                    date: formatPkt(d.date, 'DD MMM'),
                    fullDate: formatPkt(d.date, 'ddd, D MMM'),
                })),
            )
            if (h.goals) setHabitGoals(h.goals)
            setError('habits', null)
        } catch (err) { setError('habits', err.message || 'Could not load your daily progress') }
        finally { setHabitsLoading(false) }
    }

    useEffect(() => {
        Promise.all([
            loadWeight(),
            loadCompletion(),
            loadHabits(14),
            api.get('/clients/me/workout-adherence?weeks=6').then(setAdherence).catch(() => { }),
        ]).finally(() => setLoading(false))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Weight numbers come from the API summary (start weight / target live on the
    // client record); with no data they stay null and render as "—", never 0.
    const stats = useMemo(() => {
        const start = weightSummary?.startWeight ?? client?.startWeight ?? weightEntries[0]?.weight ?? null
        const current = weightSummary?.currentWeight ?? weightEntries.at(-1)?.weight ?? client?.weight ?? null
        const target = weightSummary?.targetWeight ?? client?.target ?? null
        const lost = start != null && current != null ? Math.round((start - current) * 10) / 10 : null
        const toGo = current != null && target != null ? Math.round((current - target) * 10) / 10 : null
        const progressPct = start != null && current != null && target != null && start !== target
            ? Math.min(100, Math.max(0, Math.round(((start - current) / (start - target)) * 100)))
            : null
        return { start, current, target, lost, toGo, progressPct }
    }, [weightEntries, weightSummary, client])

    const handleLogWeight = async () => {
        if (!newWeight || newWeight <= 0) { message.warning('Please enter a valid weight'); return }
        setSaving(true)
        try {
            await api.post('/progress/weight', { weightKg: newWeight, date: newDate.toISOString() })
            applyWeight(await api.get('/progress/weight'))
            message.success(`Logged ${newWeight} kg`)
            setModalOpen(false)
            setNewWeight(null)
            setNewDate(dayjs())
        } catch { message.error('Failed to log weight') }
        finally { setSaving(false) }
    }

    // Habit streak stats
    const habitStats = useMemo(() => {
        const waterDone = habitHistory.filter((d) => d.water).length
        const sleepDone = habitHistory.filter((d) => d.sleep).length
        const workoutDone = habitHistory.filter((d) => d.workout).length
        const total = habitHistory.length
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
        const dietDays = habitHistory.filter((d) => d.dietAdherencePct != null)
        return {
            waterPct: pct(waterDone),
            sleepPct: pct(sleepDone),
            workoutPct: pct(workoutDone),
            waterDone,
            sleepDone,
            workoutDone,
            total,
            dietAvg: dietDays.length ? Math.round(dietDays.reduce((sum, d) => sum + d.dietAdherencePct, 0) / dietDays.length) : null,
            dietDays: dietDays.length,
            cheatMeals: habitHistory.reduce((sum, d) => sum + (d.mealsCheat || 0), 0),
        }
    }, [habitHistory])

    if (loading) return <LoadingSkeleton />

    const weeklyLogged = (completion?.weeklyCompletion?.length ?? 0) > 0
    const weeklyAvg = completion?.weeklyAveragePct ?? 0

    return (
        <div>
            <PageHeader title="My Progress" subtitle="Look how far you've come. Keep it up!">
                <div className="flex items-center gap-2">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Log Weight</Button>
                    <RequestCorrection area="progress" />
                </div>
            </PageHeader>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Weight Lost" value={fmtKg(stats.lost)} accent="var(--color-success)" hint="Since you started" />
                <StatCard label="Current Weight" value={fmtKg(stats.current)} />
                <StatCard label="To Goal" value={fmtKg(stats.toGo)} hint={stats.target != null ? `Target ${stats.target}kg` : 'No target set'} />
                <StatCard label="Goal Progress" value={stats.progressPct == null ? '—' : `${stats.progressPct}%`} accent="var(--color-primary)" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Weight Journey" subtitle={`${weightEntries.length} weigh-ins (kg)`}>
                    {errors.weight ? (
                        <SectionMessage text={errors.weight} onRetry={loadWeight} height={280} />
                    ) : weightEntries.length === 0 ? (
                        <SectionMessage text="No weigh-ins yet — tap “Log Weight” to add your first." height={280} />
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={weightEntries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <defs><linearGradient id="wline" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={primary} /><stop offset="100%" stopColor="var(--color-success)" /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="weight" name="Weight" stroke="url(#wline)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
                <ChartCard title="Weekly Consistency" subtitle="Avg. completion">
                    {errors.completion ? (
                        <SectionMessage text={errors.completion} onRetry={loadCompletion} height={200} />
                    ) : !weeklyLogged ? (
                        <SectionMessage text="Nothing logged in the last 7 days." height={200} />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center">
                            <ProgressRing value={weeklyAvg} size={150} sublabel="this week" />
                            <p className="mt-4 text-center text-sm text-text-secondary">Consistency beats intensity!</p>
                        </div>
                    )}
                </ChartCard>
            </div>

            <div className="mt-4"><ProgressPhotos /></div>

            {/* Daily Habit + Diet Tracking */}
            <div className="mt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="section-title m-0">Daily Habits &amp; Diet</h3>
                    <Segmented
                        value={habitDays}
                        disabled={habitsLoading}
                        onChange={(v) => { setHabitDays(v); loadHabits(v) }}
                        options={[
                            { value: 7, label: '7 days' },
                            { value: 14, label: '14 days' },
                            { value: 30, label: '30 days' },
                        ]}
                    />
                </div>

                {errors.habits ? (
                    <div className="app-card p-5"><SectionMessage text={errors.habits} onRetry={() => loadHabits(habitDays)} height={160} /></div>
                ) : habitHistory.length === 0 ? (
                    <div className="app-card p-5">
                        <SectionMessage text={`No progress logged in the last ${habitDays} days. Check off your meals, water, sleep and workout to see your trends here.`} height={160} />
                    </div>
                ) : (
                    <div className={habitsLoading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="app-card flex flex-col items-center p-5">
                                <ProgressRing value={habitStats.waterPct} size={100} sublabel="water" />
                                <div className="mt-3 text-center">
                                    <div className="text-sm font-bold text-text-primary">{habitStats.waterDone}/{habitStats.total} days</div>
                                    <div className="text-xs text-text-muted">Goal: {habitGoals.waterGoal}L / day</div>
                                </div>
                            </div>
                            <div className="app-card flex flex-col items-center p-5">
                                <ProgressRing value={habitStats.sleepPct} size={100} sublabel="sleep" />
                                <div className="mt-3 text-center">
                                    <div className="text-sm font-bold text-text-primary">{habitStats.sleepDone}/{habitStats.total} days</div>
                                    <div className="text-xs text-text-muted">Goal: {habitGoals.sleepGoal}h / night</div>
                                </div>
                            </div>
                            <div className="app-card flex flex-col items-center p-5">
                                <ProgressRing value={habitStats.workoutPct} size={100} sublabel="workout" />
                                <div className="mt-3 text-center">
                                    <div className="text-sm font-bold text-text-primary">{habitStats.workoutDone}/{habitStats.total} days</div>
                                    <div className="text-xs text-text-muted">Completed workouts</div>
                                </div>
                            </div>
                        </div>

                        {adherence?.totals && (
                            <div className="mt-4 app-card p-4">
                                <div className="mb-3 text-sm font-semibold text-text-secondary">Workout Adherence — last 6 weeks</div>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <div className="text-xl font-extrabold" style={{ color: 'var(--color-success)' }}>{adherence.totals.completed}</div>
                                        <div className="text-xs text-text-muted">Completed</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-extrabold" style={{ color: 'var(--color-warning)' }}>{adherence.totals.partial}</div>
                                        <div className="text-xs text-text-muted">Partial</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-extrabold" style={{ color: 'var(--color-danger)' }}>{adherence.totals.missed}</div>
                                        <div className="text-xs text-text-muted">Missed</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <ChartCard title="Daily Completion" subtitle={`Last ${habitDays} days (%)`}>
                                <ResponsiveContainer width="100%" height={240}>
                                    <BarChart data={habitHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={36} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null
                                                const d = payload[0].payload
                                                return (
                                                    <div className="rounded-lg border px-3 py-2 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                                        <div className="text-xs font-semibold text-text-primary">{d.fullDate} — {d.completionPct}%</div>
                                                        <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-text-muted">
                                                            <span>{d.water ? '✅' : '❌'} Water</span>
                                                            <span>{d.sleep ? '✅' : '❌'} Sleep</span>
                                                            <span>{d.workout ? '✅' : '❌'} Workout</span>
                                                            <span>🍽️ Meals: {d.mealsDone}/{d.mealsTotal}</span>
                                                        </div>
                                                    </div>
                                                )
                                            }}
                                        />
                                        <Bar dataKey="completionPct" name="Completion" radius={[4, 4, 0, 0]}>
                                            {habitHistory.map((entry, i) => (
                                                <Cell key={i} fill={pctFill(entry.completionPct)} fillOpacity={0.85} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard
                                title="Diet Adherence"
                                subtitle={habitStats.dietAvg == null ? `Last ${habitDays} days` : `Avg ${habitStats.dietAvg}% over ${habitStats.dietDays} logged ${habitStats.dietDays === 1 ? 'day' : 'days'} · ${habitStats.cheatMeals} cheat ${habitStats.cheatMeals === 1 ? 'meal' : 'meals'}`}
                            >
                                {habitStats.dietAvg == null ? (
                                    <SectionMessage text="No diet items checked off in this period. Tick your food items on the Diet page." height={240} />
                                ) : (
                                    <ResponsiveContainer width="100%" height={240}>
                                        <BarChart data={habitHistory} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={36} />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (!active || !payload?.length) return null
                                                    const d = payload[0].payload
                                                    return (
                                                        <div className="rounded-lg border px-3 py-2 shadow-sm" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                                                            <div className="text-xs font-semibold text-text-primary">{d.fullDate} — {d.dietAdherencePct == null ? 'no items' : `${d.dietAdherencePct}%`}</div>
                                                            <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-text-muted">
                                                                <span>{d.mealItemsDone}/{d.mealItemsTotal} items eaten</span>
                                                                <span>{d.mealsDone} completed · {d.mealsPartial} partial</span>
                                                                {d.mealsCheat > 0 && <span>🔥 {d.mealsCheat} cheat {d.mealsCheat === 1 ? 'meal' : 'meals'}</span>}
                                                            </div>
                                                        </div>
                                                    )
                                                }}
                                            />
                                            <Bar dataKey="dietAdherencePct" name="Diet adherence" radius={[4, 4, 0, 0]}>
                                                {habitHistory.map((entry, i) => (
                                                    <Cell key={i} fill={entry.dietAdherencePct == null ? 'var(--color-border)' : pctFill(entry.dietAdherencePct)} fillOpacity={0.85} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </ChartCard>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-6"><GlucoseChart /></div>

            <Modal title="Log Your Weight" open={modalOpen} onCancel={() => { setModalOpen(false); setNewWeight(null); setNewDate(dayjs()) }} onOk={handleLogWeight} okText="Save" okButtonProps={{ loading: saving, disabled: !newWeight }} centered destroyOnHidden>
                <p className="mb-4 text-sm text-text-secondary">Record today's weight so your trainer can track your journey.</p>
                <div className="flex flex-col gap-4">
                    <div><label className="mb-1 block text-sm font-medium text-text-secondary">Weight (kg)</label><InputNumber value={newWeight} onChange={setNewWeight} min={20} max={300} step={0.1} precision={1} placeholder="e.g. 67.5" className="!w-full" size="large" autoFocus /></div>
                    <div><label className="mb-1 block text-sm font-medium text-text-secondary">Date</label><DatePicker value={newDate} onChange={setNewDate} disabledDate={(d) => d && d.isAfter(dayjs(), 'day')} className="!w-full" size="large" /></div>
                </div>
            </Modal>
        </div>
    )
}
