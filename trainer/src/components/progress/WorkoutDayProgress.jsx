import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Progress, Skeleton } from 'antd'
import { LeftOutlined, RightOutlined, ReloadOutlined, CheckCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import EmptyState from '../common/EmptyState'
import { api } from '../../services/api'
import { pktDateStr, addDaysToDateStr, formatPkt } from '../../utils/pkt'
import { dayForWeekday, weekdayIndex } from '../../utils/weekdays'

const STRIP_DAYS = 7

// Colours come from the existing theme tokens — same chips as DietDayProgress.
const STATUS_META = {
    done: { label: 'Completed', fg: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    partial: { label: 'Partial', fg: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    in_progress: { label: 'In progress', fg: 'var(--color-primary)', soft: 'var(--color-primary-soft)' },
    missed: { label: 'Missed', fg: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
    pending: { label: 'Not started yet', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
    upcoming: { label: 'Upcoming', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
    rest: { label: 'Rest day', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
}

const pctColor = (pct) => (pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-primary)' : 'var(--color-warning)')

// Sessions arrive newest-first, so the first one seen per training day is the
// latest attempt — the one that decides whether that day was completed.
function latestByDay(sessions) {
    const map = new Map()
    for (const s of sessions) if (!map.has(String(s.dayId))) map.set(String(s.dayId), s)
    return map
}

// What happened on one calendar date: the plan day scheduled for its weekday,
// the session logged for it (if any), and any other workouts done that date.
function resolveDate(date, todayStr, planDays, sessions) {
    const scheduled = dayForWeekday(planDays, dayjs(date).format('dddd'))
    const byDay = latestByDay(sessions)
    // Saving a plan re-creates its days (new ids), so a session logged before the
    // last edit is matched to the scheduled day by weekday name instead.
    const sameWeekday = (s) => weekdayIndex(s.day) !== -1 && weekdayIndex(s.day) === weekdayIndex(scheduled.day)
    const session = scheduled
        ? byDay.get(String(scheduled.id)) || [...byDay.values()].find(sameWeekday) || null
        : null
    const others = [...byDay.values()].filter((s) => s !== session)

    let status
    if (!scheduled) status = 'rest'
    else if (session?.status === 'completed') status = session.completionPct >= 100 ? 'done' : 'partial'
    else if (session) status = date === todayStr ? 'in_progress' : 'partial'
    else if (date > todayStr) status = 'upcoming'
    else if (date === todayStr) status = 'pending'
    else status = 'missed'

    return { scheduled, session, others, status }
}

function StatusChip({ status, pct }) {
    const meta = STATUS_META[status]
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: meta.soft, color: meta.fg }}>
            {status === 'done' && <CheckCircleFilled />}
            {meta.label}
            {(status === 'partial' || status === 'in_progress') && pct != null && ` · ${pct}%`}
        </span>
    )
}

// One logged workout: every exercise with its target vs actual sets.
function SessionCard({ session, title }) {
    return (
        <div className="app-card p-5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-text-secondary">{title}</span>
                <span className="font-bold text-text-primary">{session.doneSets}/{session.totalSets} sets · {session.completionPct}%</span>
            </div>
            <Progress
                percent={session.completionPct}
                showInfo={false}
                strokeColor={session.completionPct === 100 ? 'var(--color-success)' : 'var(--color-primary)'}
            />
            <div className="mt-1 text-xs text-text-muted">
                Started {formatPkt(session.startedAt, 'h:mm A')}
                {session.completedAt ? ` · Finished ${formatPkt(session.completedAt, 'h:mm A')}` : ' · Not finished'}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(session.exercises || []).map((ex, exi) => {
                    const allDone = ex.totalSets > 0 && ex.doneSets === ex.totalSets
                    return (
                        <div
                            key={exi}
                            className="rounded-xl p-3"
                            style={{ background: 'var(--color-surface-secondary)', borderLeft: `3px solid ${allDone ? 'var(--color-success)' : 'var(--color-border)'}` }}
                        >
                            <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-text-primary">
                                    {allDone && <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 13 }} />}
                                    <span className="truncate">{ex.name}</span>
                                </span>
                                <span className="shrink-0 text-xs text-text-muted">{ex.doneSets}/{ex.totalSets} sets</span>
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
                                                <td className="py-0.5 pr-3">{set.setNumber}</td>
                                                <td className="py-0.5 pr-3">
                                                    {ex.trackingType === 'duration'
                                                        ? `${set.targetDuration ?? '—'}s`
                                                        : `${set.targetReps}${set.targetWeight ? ` @ ${set.targetWeight}kg` : ''}`}
                                                </td>
                                                <td className="py-0.5 pr-3">
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
                    )
                })}
            </div>
            {session.notes && <div className="mt-3 text-xs italic text-text-secondary">Client note: {session.notes}</div>}
        </div>
    )
}

// One client's workout progress for a chosen date: which training day the plan
// scheduled for that weekday and what the client actually logged (sets, reps,
// weight). Mirrors DietDayProgress — same date bar and 7-day quick-jump strip —
// with sessions from GET /workout-sessions?from=&to=.
export default function WorkoutDayProgress({ clientId, plan }) {
    const todayStr = pktDateStr()
    const [date, setDate] = useState(todayStr)
    const [reloadKey, setReloadKey] = useState(0)
    const [state, setState] = useState({ sessions: null, loading: true, error: null })
    const [recent, setRecent] = useState([])
    const planDays = useMemo(() => plan?.days || [], [plan])

    // Sessions behind the quick-jump strip (the last 7 days).
    useEffect(() => {
        let cancelled = false
        api.get(`/workout-sessions?client=${clientId}&from=${addDaysToDateStr(todayStr, -(STRIP_DAYS - 1))}&to=${todayStr}&limit=100`)
            .then((res) => { if (!cancelled) setRecent(res.items || []) })
            .catch(() => { if (!cancelled) setRecent([]) })
        return () => { cancelled = true }
    }, [clientId, todayStr, reloadKey])

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true, error: null }))
        api.get(`/workout-sessions?client=${clientId}&from=${date}&to=${date}&limit=50`)
            .then((res) => { if (!cancelled) setState({ sessions: res.items || [], loading: false, error: null }) })
            .catch((err) => { if (!cancelled) setState({ sessions: null, loading: false, error: err.message || 'Could not load this day' }) })
        return () => { cancelled = true }
    }, [clientId, date, reloadKey])

    const strip = useMemo(() => Array.from({ length: STRIP_DAYS }, (_, i) => {
        const d = addDaysToDateStr(todayStr, i - (STRIP_DAYS - 1))
        const sessions = recent.filter((s) => formatPkt(s.date, 'YYYY-MM-DD') === d)
        return { date: d, ...resolveDate(d, todayStr, planDays, sessions) }
    }), [recent, planDays, todayStr])

    const { sessions, loading, error } = state
    const isToday = date === todayStr
    const weekday = dayjs(date).format('dddd')

    const dateBar = (
        <div className="app-card mb-4 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button icon={<LeftOutlined />} onClick={() => setDate((d) => addDaysToDateStr(d, -1))} aria-label="Previous day" />
                    <DatePicker
                        value={dayjs(date)}
                        allowClear={false}
                        format="ddd, D MMM YYYY"
                        disabledDate={(d) => d.format('YYYY-MM-DD') > todayStr}
                        onChange={(d) => d && setDate(d.format('YYYY-MM-DD'))}
                    />
                    <Button icon={<RightOutlined />} disabled={isToday} onClick={() => setDate((d) => addDaysToDateStr(d, 1))} aria-label="Next day" />
                    {!isToday && <Button onClick={() => setDate(todayStr)}>Today</Button>}
                </div>
                <span className="text-xs text-text-muted">{isToday ? `Today · ${weekday}` : weekday}</span>
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Last 7 days">
                {strip.map(({ date: d, scheduled, session, others, status }) => {
                    const selected = d === date
                    const shown = session || others[0] || null
                    const text = shown ? `${shown.completionPct}%` : status === 'rest' ? 'Rest' : status === 'missed' ? 'Missed' : '—'
                    const color = shown ? pctColor(shown.completionPct) : status === 'missed' ? 'var(--color-danger)' : 'var(--color-text-muted)'
                    return (
                        <button
                            key={d}
                            role="listitem"
                            onClick={() => setDate(d)}
                            className="flex min-w-[52px] flex-1 shrink-0 flex-col items-center rounded-lg px-2 py-1.5 text-center transition-colors"
                            style={{
                                background: selected ? 'var(--color-primary-soft)' : 'var(--color-surface-secondary)',
                                border: `1px solid ${selected ? 'var(--color-primary)' : 'transparent'}`,
                            }}
                            title={`${d}: ${scheduled ? `${scheduled.day}${scheduled.focus ? ` — ${scheduled.focus}` : ''} · ` : ''}${STATUS_META[status].label}`}
                        >
                            <span className="text-[10px] font-medium uppercase text-text-muted">{dayjs(d).format('ddd')}</span>
                            <span className="text-sm font-bold text-text-primary">{dayjs(d).format('D')}</span>
                            <span className="text-[11px] font-semibold" style={{ color }}>{text}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )

    if (error) {
        return (
            <div>
                {dateBar}
                <div className="app-card">
                    <EmptyState
                        title="Couldn't load this day"
                        description={error}
                        action={<Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>}
                    />
                </div>
            </div>
        )
    }

    if (!sessions) {
        return (
            <div>
                {dateBar}
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 5 }} /></div>
            </div>
        )
    }

    const { scheduled, session, others, status } = resolveDate(date, todayStr, planDays, sessions)
    const dateLabel = dayjs(date).format('dddd, D MMM YYYY')

    return (
        <div>
            {dateBar}

            <div className={`flex flex-col gap-4 transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                {!scheduled && others.length === 0 && (
                    <div className="app-card">
                        <EmptyState
                            title={plan ? `Rest day — no workout scheduled for ${weekday}` : 'No exercise plan'}
                            description={plan ? `Nothing was planned or logged on ${dateLabel}.` : 'Progress appears here once an exercise plan is published for this client.'}
                        />
                    </div>
                )}

                {scheduled && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-text-primary">{[scheduled.day, scheduled.focus].filter(Boolean).join(' — ')}</span>
                        <StatusChip status={status} pct={session?.completionPct} />
                    </div>
                )}

                {scheduled && session && (
                    <SessionCard session={session} title={isToday ? "Today's workout" : 'Workout logged'} />
                )}

                {scheduled && !session && (
                    <div className="app-card p-5">
                        <div className="mb-3 text-sm font-semibold text-text-secondary">
                            {status === 'missed'
                                ? `The client did not log this workout on ${dateLabel}.`
                                : status === 'upcoming'
                                    ? 'This date is in the future — the client can’t log anything yet.'
                                    : 'The client has not started this workout yet.'}
                        </div>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {(scheduled.exercises || []).map((ex, i) => (
                                <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                    <div className="truncate text-sm font-semibold text-text-primary">{ex.name}</div>
                                    <div className="mt-0.5 text-xs text-text-muted">
                                        {ex.sets} sets × {ex.trackingType === 'duration' ? `${ex.targetDuration || ex.reps}s` : ex.reps}
                                        {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {others.map((s) => (
                    <SessionCard
                        key={s._id || s.id}
                        session={s}
                        title={`Also logged: ${[s.day, s.focus].filter(Boolean).join(' — ')}${scheduled ? '' : ' (not scheduled for this weekday)'}`}
                    />
                ))}
            </div>
        </div>
    )
}
