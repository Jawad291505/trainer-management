import { useEffect, useMemo, useState } from 'react'
import { Button, DatePicker, Progress, Skeleton } from 'antd'
import {
    LeftOutlined,
    RightOutlined,
    ReloadOutlined,
    FireOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    MedicineBoxOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import EmptyState from '../common/EmptyState'
import { api } from '../../services/api'
import { pktDateStr, addDaysToDateStr, formatPkt } from '../../utils/pkt'
import { formatMealTime } from '../../utils/time'

const STRIP_DAYS = 7

// Colours come from the existing theme tokens; `soft`/`fg` mirror the chips used elsewhere.
const STATUS_META = {
    done: { label: 'Completed', fg: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    partial: { label: 'Partial', fg: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    cheat: { label: 'Cheat meal', fg: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    missed: { label: 'Missed', fg: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
    pending: { label: 'Not logged yet', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
    upcoming: { label: 'Upcoming', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
    nodata: { label: 'No data', fg: 'var(--color-text-muted)', soft: 'var(--color-surface-secondary)' },
}
const GLUCOSE_FLAG = { normal: 'var(--color-success)', low: 'var(--color-danger)', high: 'var(--color-danger)' }

const pctColor = (pct) => (pct >= 80 ? 'var(--color-success)' : pct >= 50 ? 'var(--color-primary)' : 'var(--color-warning)')

function GlucoseChip({ phase, reading }) {
    const label = phase === 'before' ? 'Before' : 'After'
    if (!reading) {
        return (
            <span className="rounded-full px-2.5 py-1 text-xs text-text-muted" style={{ background: 'var(--color-surface-secondary)' }}>
                {label}: —
            </span>
        )
    }
    const ok = reading.flag === 'normal'
    return (
        <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: ok ? 'var(--color-success-soft)' : 'var(--color-danger-soft)', color: GLUCOSE_FLAG[reading.flag] }}
            title={`${formatPkt(reading.takenAt, 'h:mm A')}${reading.note ? ` — ${reading.note}` : ''}`}
        >
            {label}: {reading.valueMgDl} mg/dL{!ok && ` (${reading.flag})`}
        </span>
    )
}

function MealRow({ meal, hasLog, isFuture }) {
    const statusKey = meal.status === 'pending' || meal.status === 'missed' || meal.status === 'upcoming'
        ? (hasLog ? meal.status : isFuture ? 'upcoming' : 'nodata')
        : meal.status
    const meta = STATUS_META[statusKey]
    const hasGlucose = meal.glucose.before || meal.glucose.after
    return (
        <div className="app-card p-5" style={meal.status === 'cheat' ? { borderColor: 'var(--color-warning)' } : meal.status === 'done' ? { borderColor: 'var(--color-success)' } : undefined}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        {meal.status === 'done' && <CheckCircleFilled style={{ color: 'var(--color-success)' }} />}
                        <span className="font-bold text-text-primary">{meal.name}</span>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: meta.soft, color: meta.fg }}>
                            {meal.status === 'cheat' && <FireOutlined />}
                            {meta.label}
                            {meal.status === 'partial' && ` · ${meal.itemsEaten}/${meal.itemsTotal}`}
                        </span>
                        {meal.removed && <span className="text-[11px] text-text-muted">{meal.counted ? '(no longer in the plan)' : '(from an earlier plan — not counted)'}</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                        {meal.time && <span className="flex items-center gap-1"><ClockCircleOutlined /> {formatMealTime(meal.time)}</span>}
                        {meal.optionLabel && <span>· {meal.optionLabel}</span>}
                    </div>
                </div>
                {meal.totals && (
                    <div className="rounded-lg px-2.5 py-1 text-xs font-bold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        {meal.totals.cal} kcal
                    </div>
                )}
            </div>

            {meal.items.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                    {meal.items.map((it, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm"
                            style={{ background: it.eaten ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)' }}
                        >
                            <span className="flex min-w-0 items-center gap-2 font-medium text-text-primary">
                                {it.eaten
                                    ? <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 13 }} />
                                    : <span className="inline-block h-3 w-3 shrink-0 rounded-full border" style={{ borderColor: 'var(--color-border-strong)' }} />}
                                <span className="truncate">{it.name}</span>
                            </span>
                            <span className="shrink-0 text-text-muted">{it.qtyLabel}</span>
                        </div>
                    ))}
                </div>
            )}

            {meal.totals && meal.items.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t pt-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
                    {[['Protein', meal.totals.protein], ['Carbs', meal.totals.carbs], ['Fats', meal.totals.fat]].map(([label, v]) => (
                        <div key={label}>
                            <div className="text-sm font-bold text-text-primary">{v}g</div>
                            <div className="text-[11px] text-text-muted">{label}</div>
                        </div>
                    ))}
                </div>
            )}

            {meal.cheat && (
                <div className="mt-3 rounded-lg p-3" style={{ background: 'var(--color-warning-soft)' }}>
                    {meal.cheat.note && <div className="text-xs text-text-secondary">{meal.cheat.note}</div>}
                    {meal.cheat.items?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {meal.cheat.items.map((item, i) => (
                                <span key={i} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>{item}</span>
                            ))}
                        </div>
                    )}
                    {!meal.cheat.note && !meal.cheat.items?.length && (
                        <div className="text-xs text-text-muted">Client marked this as a cheat meal (no details provided)</div>
                    )}
                </div>
            )}

            {hasGlucose && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                    <span className="flex items-center gap-1 text-xs font-semibold text-text-muted"><MedicineBoxOutlined /> Blood glucose</span>
                    <GlucoseChip phase="before" reading={meal.glucose.before} />
                    <GlucoseChip phase="after" reading={meal.glucose.after} />
                </div>
            )}

            {meal.notes && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>{meal.notes}</div>
            )}
        </div>
    )
}

// One client's diet progress for a chosen date: what the plan asked for that
// day and what the client actually logged (items eaten, cheat meals, glucose
// readings, habits). All of it comes from GET /progress/diet-day — nothing is
// derived from static data — and past dates are browsable via the date bar.
export default function DietDayProgress({ clientId, initialDate }) {
    const todayStr = pktDateStr()
    // `initialDate` (YYYY-MM-DD) lets a link open a specific day; ignored if malformed or in the future.
    const [date, setDate] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(initialDate || '') && initialDate <= todayStr ? initialDate : todayStr))
    const [reloadKey, setReloadKey] = useState(0)
    const [state, setState] = useState({ data: null, loading: true, error: null })
    const [history, setHistory] = useState([])

    // Per-day adherence for the quick-jump strip (days with no log are absent).
    useEffect(() => {
        let cancelled = false
        api.get(`/progress/daily/history?client=${clientId}&days=${STRIP_DAYS}`)
            .then((res) => { if (!cancelled) setHistory(res.history || []) })
            .catch(() => { if (!cancelled) setHistory([]) })
        return () => { cancelled = true }
    }, [clientId, reloadKey])

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true, error: null }))
        api.get(`/progress/diet-day?client=${clientId}&date=${date}`)
            .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
            .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Could not load this day' }) })
        return () => { cancelled = true }
    }, [clientId, date, reloadKey])

    const strip = useMemo(() => {
        const byDate = new Map(history.map((h) => [formatPkt(h.date, 'YYYY-MM-DD'), h]))
        return Array.from({ length: STRIP_DAYS }, (_, i) => {
            const d = addDaysToDateStr(todayStr, i - (STRIP_DAYS - 1))
            return { date: d, entry: byDate.get(d) || null }
        })
    }, [history, todayStr])

    const { data, loading, error } = state
    const isToday = date === todayStr

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
                {data && (
                    <span className="text-xs text-text-muted">
                        {data.plan ? data.plan.title : 'No published plan'}{data.dayName ? ` · ${data.dayName} menu` : ''}
                    </span>
                )}
            </div>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" role="list" aria-label="Last 7 days">
                {strip.map(({ date: d, entry }) => {
                    const selected = d === date
                    const pct = entry?.dietAdherencePct
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
                            title={entry ? `${d}: ${pct == null ? 'no diet items logged' : `${pct}% diet adherence`}` : `${d}: no data`}
                        >
                            <span className="text-[10px] font-medium uppercase text-text-muted">{dayjs(d).format('ddd')}</span>
                            <span className="text-sm font-bold text-text-primary">{dayjs(d).format('D')}</span>
                            <span className="text-[11px] font-semibold" style={{ color: pct == null ? 'var(--color-text-muted)' : pctColor(pct) }}>
                                {pct == null ? '—' : `${pct}%`}
                            </span>
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

    if (!data) {
        return (
            <div>
                {dateBar}
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 6 }} /></div>
            </div>
        )
    }

    const { summary, meals, habits, hasLog, hasActivity, isFuture } = data
    const counts = meals.filter((m) => !m.removed || m.counted).reduce((acc, m) => ({ ...acc, [m.status]: (acc[m.status] || 0) + 1 }), {})
    const dateLabel = formatPkt(data.date, 'dddd, D MMM YYYY')

    let banner = null
    if (isFuture) {
        banner = { type: 'info', message: 'This date is in the future — the client can’t log anything yet.' }
    } else if (!hasLog) {
        banner = { type: 'info', message: `No progress was submitted for ${dateLabel}.`, description: 'The client did not open or log anything on this day.' }
    } else if (!hasActivity) {
        banner = { type: 'warning', message: 'The client opened this day but has not logged anything yet.' }
    }

    return (
        <div>
            {dateBar}

            {banner && (
                <div
                    className="mb-4 rounded-xl px-4 py-3 text-sm"
                    style={{
                        background: banner.type === 'warning' ? 'var(--color-warning-soft)' : 'var(--color-info-soft)',
                        color: banner.type === 'warning' ? 'var(--color-warning)' : 'var(--color-info)',
                    }}
                >
                    <div className="font-semibold">{banner.message}</div>
                    {banner.description && <div className="mt-0.5 text-xs opacity-90">{banner.description}</div>}
                </div>
            )}

            {meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title={data.plan ? `No meals planned for ${data.weekday}` : 'No published diet plan'}
                        description={data.plan ? 'The plan has no menu for this weekday.' : 'Progress appears here once a diet plan is published for this client.'}
                    />
                </div>
            ) : (
                <div className={`transition-opacity ${loading ? 'pointer-events-none opacity-50' : ''}`}>
                    {hasLog && (
                        <div className="app-card mb-4 p-5">
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="font-semibold text-text-secondary">{isToday ? "Today's diet adherence" : 'Diet adherence'}</span>
                                <span className="font-bold text-text-primary">
                                    {summary.adherencePct == null
                                        ? 'No items to measure'
                                        : `${summary.itemsDone}/${summary.itemsTotal} items · ${summary.adherencePct}%`}
                                </span>
                            </div>
                            <Progress
                                percent={summary.adherencePct ?? 0}
                                showInfo={false}
                                strokeColor={summary.adherencePct === 100 ? 'var(--color-success)' : 'var(--color-primary)'}
                            />
                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                {[
                                    ['done', counts.done, 'completed'],
                                    ['partial', counts.partial, 'partial'],
                                    ['cheat', counts.cheat, 'cheat'],
                                    ['missed', counts.missed, 'missed'],
                                    ['pending', counts.pending, 'not logged'],
                                ].filter(([, n]) => n).map(([k, n, label]) => (
                                    <span key={k} className="rounded-full px-3 py-1" style={{ background: STATUS_META[k].soft, color: STATUS_META[k].fg }}>
                                        {n} {label}
                                    </span>
                                ))}
                            </div>

                            {data.macrosComparable && hasActivity && (
                                <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
                                    {[
                                        ['Calories', summary.eaten.cal, summary.planned.cal, ''],
                                        ['Protein', summary.eaten.protein, summary.planned.protein, 'g'],
                                        ['Carbs', summary.eaten.carbs, summary.planned.carbs, 'g'],
                                        ['Fats', summary.eaten.fat, summary.planned.fat, 'g'],
                                    ].map(([label, eaten, planned, unit]) => (
                                        <div key={label}>
                                            <div className="text-base font-extrabold text-text-primary">{eaten}{unit}</div>
                                            <div className="text-[11px] text-text-muted">of {planned}{unit} {label.toLowerCase()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {habits.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: 'var(--color-border)' }}>
                                    {habits.map((h) => (
                                        <span
                                            key={h.key}
                                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                                            style={{ background: h.done ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)', color: h.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                        >
                                            {h.done && <CheckCircleFilled />} {h.label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {summary.glucose.count > 0 && (
                                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="flex items-center gap-1 font-semibold text-text-secondary"><MedicineBoxOutlined /> Glucose</span>
                                    <span className="text-text-muted">{summary.glucose.count} readings · avg {summary.glucose.average} mg/dL · {summary.glucose.min}–{summary.glucose.max}</span>
                                    {summary.glucose.outOfRange > 0 && (
                                        <span className="rounded-full px-2 py-0.5 font-semibold" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                                            {summary.glucose.outOfRange} out of range
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {meals.map((m) => <MealRow key={m.id} meal={m} hasLog={hasLog} isFuture={isFuture} />)}
                    </div>
                </div>
            )}
        </div>
    )
}
