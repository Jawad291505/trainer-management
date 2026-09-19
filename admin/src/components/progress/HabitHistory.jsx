import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Progress, Segmented, Skeleton } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import ChartCard from '../common/ChartCard'
import EmptyState from '../common/EmptyState'
import { api } from '../../services/api'
import { formatPkt } from '../../utils/pkt'

const RANGE_OPTIONS = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
]

const pctFill = (pct) => (pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-primary)' : 'var(--color-warning)')

// Trend view of one client's daily logging: water / sleep / workout streaks,
// daily completion and diet adherence, plus their latest logged day. Read-only,
// backed by GET /progress/daily/history — days the client never logged have no
// record and are simply absent (not shown as zero).
export default function HabitHistory({ clientId }) {
    const [days, setDays] = useState(14)
    const [reloadKey, setReloadKey] = useState(0)
    const [state, setState] = useState({ data: null, loading: true, error: null })

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true, error: null }))
        api.get(`/progress/daily/history?client=${clientId}&days=${days}`)
            .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
            .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Could not load progress history' }) })
        return () => { cancelled = true }
    }, [clientId, days, reloadKey])

    const { data, loading, error } = state
    const goals = data?.goals || { waterGoal: 2, sleepGoal: 8 }

    const rows = useMemo(
        () => (data?.history || []).map((d) => ({ ...d, label: formatPkt(d.date, 'D MMM'), fullDate: formatPkt(d.date, 'ddd, D MMM') })),
        [data],
    )

    const stats = useMemo(() => {
        const total = rows.length
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
        const water = rows.filter((d) => d.water).length
        const sleep = rows.filter((d) => d.sleep).length
        const workout = rows.filter((d) => d.workout).length
        const avg = total ? Math.round(rows.reduce((s, d) => s + d.completionPct, 0) / total) : 0
        return { total, avg, water, sleep, workout, waterPct: pct(water), sleepPct: pct(sleep), workoutPct: pct(workout) }
    }, [rows])

    if (error) {
        return (
            <div className="app-card">
                <EmptyState
                    title="Couldn't load progress"
                    description={error}
                    action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>}
                />
            </div>
        )
    }

    if (!data) return <div className="app-card p-5"><Skeleton active paragraph={{ rows: 6 }} /></div>

    const range = <Segmented size="small" value={days} onChange={setDays} options={RANGE_OPTIONS} disabled={loading} />
    const latest = rows.at(-1)

    if (rows.length === 0) {
        return (
            <div className="app-card">
                <div className="flex justify-end px-5 pt-4">{range}</div>
                <EmptyState
                    title={`No daily logs in the last ${days} days`}
                    description="Water, sleep, workout and diet progress appear here once the client starts checking off their day."
                />
            </div>
        )
    }

    return (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between gap-3">
                <h3 className="section-title m-0">Daily progress</h3>
                {range}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--color-info)' }}>{stats.waterPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Water</div>
                    <div className="text-xs text-text-muted">{stats.water}/{stats.total} logged days — Goal: {goals.waterGoal}L</div>
                </div>
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: '#7c3aed' }}>{stats.sleepPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Sleep</div>
                    <div className="text-xs text-text-muted">{stats.sleep}/{stats.total} logged days — Goal: {goals.sleepGoal}h</div>
                </div>
                <div className="app-card p-4 text-center">
                    <div className="text-2xl font-extrabold" style={{ color: 'var(--color-primary)' }}>{stats.workoutPct}%</div>
                    <div className="text-sm font-semibold text-text-primary">Workout</div>
                    <div className="text-xs text-text-muted">{stats.workout}/{stats.total} logged days</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Daily Completion" subtitle={`Last ${days} days (%) — days without a log are omitted`}>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={40} />
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
                                                <span>🍽️ Meals: {d.mealsDone}/{d.mealsTotal} ({d.mealItemsDone}/{d.mealItemsTotal} items)</span>
                                            </div>
                                        </div>
                                    )
                                }}
                            />
                            <Bar dataKey="completionPct" name="Completion" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {rows.map((e, i) => <Cell key={i} fill={pctFill(e.completionPct)} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Diet Adherence" subtitle={`Last ${days} days (% of planned items eaten)`}>
                    {rows.some((d) => d.dietAdherencePct != null) ? (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={40} />
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
                                                    {d.glucoseCount > 0 && <span>🩸 {d.glucoseCount} glucose readings{d.glucoseOutOfRange ? ` (${d.glucoseOutOfRange} out of range)` : ''}</span>}
                                                </div>
                                            </div>
                                        )
                                    }}
                                />
                                <Bar dataKey="dietAdherencePct" name="Diet adherence" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                    {rows.map((e, i) => <Cell key={i} fill={e.dietAdherencePct == null ? 'var(--color-border)' : pctFill(e.dietAdherencePct)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[260px] items-center justify-center text-center text-sm text-text-muted">No diet items logged in this period</div>
                    )}
                </ChartCard>
            </div>

            <ChartCard title="Latest Logged Day" subtitle={`${latest.fullDate} · ${stats.avg}% avg. completion over ${days} days`}>
                <div className="mb-3">
                    <Progress percent={latest.completionPct} strokeColor="var(--color-primary)" />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                        { label: 'Water intake', done: latest.water },
                        { label: 'Sleep goal', done: latest.sleep },
                        { label: 'Workout', done: latest.workout },
                        { label: `Meals (${latest.mealsDone}/${latest.mealsTotal})`, done: latest.mealsTotal > 0 && latest.mealsDone === latest.mealsTotal },
                    ].map((t) => (
                        <div key={t.label} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                            <Checkbox checked={t.done} disabled />
                            <span className={`text-sm ${t.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{t.label}</span>
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>
    )
}
