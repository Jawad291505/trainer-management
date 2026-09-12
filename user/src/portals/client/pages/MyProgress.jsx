import { useState, useEffect, useMemo } from 'react'
import { Button, Modal, InputNumber, DatePicker, Segmented, App } from 'antd'
import { PlusOutlined, CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
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
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { api } from '../../../services/api'

export default function MyProgress() {
    const { primary } = useTheme()
    const { message } = App.useApp()
    const { client } = useAuth()

    const [loading, setLoading] = useState(true)
    const [weightEntries, setWeightEntries] = useState([])
    const [completion, setCompletion] = useState(null)
    const [habitHistory, setHabitHistory] = useState([])
    const [habitGoals, setHabitGoals] = useState({ waterGoal: 2, sleepGoal: 8 })
    const [habitDays, setHabitDays] = useState(14)
    const [adherence, setAdherence] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [newWeight, setNewWeight] = useState(null)
    const [newDate, setNewDate] = useState(dayjs())
    const [saving, setSaving] = useState(false)

    const mapWeightEntries = (items) =>
        (items || []).map((e) => ({ date: dayjs(e.date).format('D MMM'), weight: e.weightKg }))

    const loadHabits = async (days) => {
        try {
            const h = await api.get(`/progress/daily/history?days=${days}`)
            setHabitHistory(
                (h.history || []).map((d) => ({
                    date: dayjs(d.date).format('DD MMM'),
                    completionPct: d.completionPct,
                    water: d.water,
                    sleep: d.sleep,
                    workout: d.workout,
                    mealsDone: d.mealsDone,
                    mealsTotal: d.mealsTotal,
                })),
            )
            if (h.goals) setHabitGoals(h.goals)
        } catch { /* */ }
    }

    useEffect(() => {
        async function load() {
            try {
                const [w, c] = await Promise.all([
                    api.get('/progress/weight'),
                    api.get('/stats/client/completion?days=7').catch(() => null),
                ])
                setWeightEntries(mapWeightEntries(w.items))
                if (c) setCompletion(c)
                await loadHabits(14)
                api.get('/clients/me/workout-adherence?weeks=6').then(setAdherence).catch(() => { })
            } catch { /* */ }
            finally { setLoading(false) }
        }
        load()
    }, [])

    const stats = useMemo(() => {
        const start = weightEntries[0]?.weight ?? client?.startWeight ?? 0
        const current = weightEntries.at(-1)?.weight ?? client?.weight ?? 0
        const target = client?.target ?? 0
        const lost = Math.round((start - current) * 10) / 10
        const toGo = Math.round((current - target) * 10) / 10
        const progressPct = start !== target ? Math.min(100, Math.max(0, Math.round(((start - current) / (start - target)) * 100))) : 0
        return { start, current, target, lost, toGo, progressPct }
    }, [weightEntries, client])

    const handleLogWeight = async () => {
        if (!newWeight || newWeight <= 0) { message.warning('Please enter a valid weight'); return }
        setSaving(true)
        try {
            await api.post('/progress/weight', { weightKg: newWeight, date: newDate.toISOString() })
            const w = await api.get('/progress/weight')
            setWeightEntries(mapWeightEntries(w.items))
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
        const total = habitHistory.length || 1
        return {
            waterPct: Math.round((waterDone / total) * 100),
            sleepPct: Math.round((sleepDone / total) * 100),
            workoutPct: Math.round((workoutDone / total) * 100),
            waterDone,
            sleepDone,
            workoutDone,
            total: habitHistory.length,
        }
    }, [habitHistory])

    if (loading) return <LoadingSkeleton />

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
                <StatCard label="Weight Lost" value={`${stats.lost}kg`} accent="var(--color-success)" hint="Since you started" />
                <StatCard label="Current Weight" value={`${stats.current}kg`} />
                <StatCard label="To Goal" value={`${stats.toGo}kg`} hint={`Target ${stats.target}kg`} />
                <StatCard label="Goal Progress" value={`${stats.progressPct}%`} accent="var(--color-primary)" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Weight Journey" subtitle={`${weightEntries.length} weigh-ins (kg)`}>
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
                </ChartCard>
                <ChartCard title="Weekly Consistency" subtitle="Avg. completion">
                    <div className="flex h-full flex-col items-center justify-center">
                        <ProgressRing value={weeklyAvg} size={150} sublabel="this week" />
                        <p className="mt-4 text-center text-sm text-text-secondary">Consistency beats intensity!</p>
                    </div>
                </ChartCard>
            </div>

            <div className="mt-4"><ProgressPhotos /></div>

            {/* Daily Habit Tracking */}
            <div className="mt-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="section-title m-0">Daily Habits</h3>
                    <Segmented
                        value={habitDays}
                        onChange={(v) => { setHabitDays(v); loadHabits(v) }}
                        options={[
                            { value: 7, label: '7 days' },
                            { value: 14, label: '14 days' },
                            { value: 30, label: '30 days' },
                        ]}
                    />
                </div>

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

                {habitHistory.length > 0 && (
                    <ChartCard className="mt-4" title="Daily Completion" subtitle={`Last ${habitDays} days (%)`}>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={habitHistory} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={36} />
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
                                                    <span>🍽️ Meals: {d.mealsDone}/{d.mealsTotal}</span>
                                                </div>
                                            </div>
                                        )
                                    }}
                                />
                                <Bar dataKey="completionPct" name="Completion" radius={[4, 4, 0, 0]}>
                                    {habitHistory.map((entry, i) => (
                                        <Cell
                                            key={i}
                                            fill={entry.completionPct >= 80 ? 'var(--color-success)' : entry.completionPct >= 50 ? 'var(--color-warning)' : 'var(--color-error)'}
                                            fillOpacity={0.85}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                )}
            </div>

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
