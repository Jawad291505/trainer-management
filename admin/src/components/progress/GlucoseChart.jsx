import { useEffect, useMemo, useState } from 'react'
import { Button, Segmented, Skeleton } from 'antd'
import { MedicineBoxOutlined, ReloadOutlined } from '@ant-design/icons'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Legend,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import ChartCard from '../common/ChartCard'
import { api } from '../../services/api'
import { formatPkt } from '../../utils/pkt'

const DAY_MS = 24 * 60 * 60 * 1000
const AFTER_COLOR = '#7c3aed'
const RANGE_OPTIONS = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
]
const FLAG_LABEL = { normal: 'In range', low: 'Low', high: 'High' }

function StatTile({ label, value, hint, color }) {
    return (
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
            <div className="text-lg font-extrabold" style={{ color: color || 'var(--color-text-primary)' }}>{value}</div>
            <div className="text-[11px] font-semibold text-text-secondary">{label}</div>
            {hint && <div className="text-[11px] text-text-muted">{hint}</div>}
        </div>
    )
}

// Blood-glucose trend for one client, from their logged before/after-meal
// readings. Points sit on a real time axis (so gaps between readings are
// visible), and reference lines come from the API's clinical ranges rather
// than being hard-coded here. `clientId` is omitted when the client views
// their own data.
export default function GlucoseChart({ clientId, defaultDays = 14 }) {
    const { primary } = useTheme()
    const [days, setDays] = useState(defaultDays)
    const [reloadKey, setReloadKey] = useState(0)
    const [state, setState] = useState({ data: null, loading: true, error: null })

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true, error: null }))
        api.get(`/progress/glucose?days=${days}${clientId ? `&client=${clientId}` : ''}`)
            .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }) })
            .catch((err) => { if (!cancelled) setState({ data: null, loading: false, error: err.message || 'Could not load glucose readings' }) })
        return () => { cancelled = true }
    }, [clientId, days, reloadKey])

    const { data, loading, error } = state
    const items = data?.items || []
    const summary = data?.summary
    const ranges = data?.ranges

    const chart = useMemo(() => {
        if (!data) return null
        const start = new Date(data.from).getTime()
        const end = start + days * DAY_MS
        const step = Math.max(1, Math.ceil(days / 7))
        const ticks = Array.from({ length: Math.floor(days / step) + 1 }, (_, i) => start + i * step * DAY_MS)
        const rows = items.map((g) => ({
            ...g,
            ts: new Date(g.takenAt).getTime(),
            before: g.phase === 'before' ? g.valueMgDl : null,
            after: g.phase === 'after' ? g.valueMgDl : null,
        }))
        const values = items.map((g) => g.valueMgDl)
        const refs = ranges ? [ranges.before.low, ranges.before.high, ranges.after.high] : []
        const yMin = Math.floor((Math.min(...values, ...refs) - 10) / 10) * 10
        const yMax = Math.ceil((Math.max(...values, ...refs) + 10) / 10) * 10
        return { rows, start, end, ticks, yMin, yMax }
    }, [data, items, days, ranges])

    const renderDot = (color) => (props) => {
        const { cx, cy, payload, key } = props
        if (cx == null || cy == null) return null
        const outOfRange = payload.flag !== 'normal'
        return (
            <circle
                key={key}
                cx={cx}
                cy={cy}
                r={outOfRange ? 5 : 3.5}
                fill={color}
                stroke={outOfRange ? 'var(--color-danger)' : '#fff'}
                strokeWidth={outOfRange ? 2.5 : 1}
            />
        )
    }

    const renderTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null
        const g = payload[0].payload
        return (
            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
                <div className="font-bold text-text-primary">{g.valueMgDl} mg/dL</div>
                <div className="text-text-muted">{g.phase === 'before' ? 'Before' : 'After'} {g.mealName || 'meal'}</div>
                <div className="text-text-muted">{formatPkt(g.takenAt, 'ddd, D MMM · h:mm A')}</div>
                <div className="mt-1 font-semibold" style={{ color: g.flag === 'normal' ? 'var(--color-success)' : 'var(--color-danger)' }}>{FLAG_LABEL[g.flag]}</div>
                {g.note && <div className="mt-1 max-w-[200px] italic text-text-secondary">{g.note}</div>}
            </div>
        )
    }

    const range = (
        <Segmented size="small" value={days} onChange={setDays} options={RANGE_OPTIONS} disabled={loading} />
    )

    let body
    if (error) {
        body = (
            <div className="flex h-[240px] flex-col items-center justify-center gap-3 text-center">
                <div className="text-sm text-text-secondary">{error}</div>
                <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((k) => k + 1)}>Retry</Button>
            </div>
        )
    } else if (!data && loading) {
        body = <Skeleton active paragraph={{ rows: 7 }} title={false} />
    } else if (items.length === 0) {
        body = (
            <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    <MedicineBoxOutlined />
                </span>
                <div className="text-sm font-semibold text-text-primary">No glucose readings in the last {days} days</div>
                <div className="max-w-xs text-xs text-text-muted">Readings appear here once they are logged before or after a meal on the Diet page.</div>
            </div>
        )
    } else {
        body = (
            <div className={loading ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <StatTile label="Average" value={`${summary.average}`} hint="mg/dL" />
                    <StatTile label="Range" value={`${summary.min}–${summary.max}`} hint="mg/dL" />
                    <StatTile
                        label="In range"
                        value={`${summary.inRangePct}%`}
                        hint={summary.outOfRange ? `${summary.outOfRange} out of range` : 'all readings'}
                        color={summary.outOfRange ? 'var(--color-warning)' : 'var(--color-success)'}
                    />
                    <StatTile
                        label="Latest"
                        value={`${summary.latest.valueMgDl}`}
                        hint={formatPkt(summary.latest.takenAt, 'D MMM, h:mm A')}
                        color={summary.latest.flag === 'normal' ? 'var(--color-success)' : 'var(--color-danger)'}
                    />
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chart.rows} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                            dataKey="ts"
                            type="number"
                            scale="time"
                            domain={[chart.start, chart.end]}
                            ticks={chart.ticks}
                            tickFormatter={(ts) => formatPkt(ts, 'D MMM')}
                            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis domain={[chart.yMin, chart.yMax]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                        <Tooltip content={renderTooltip} />
                        <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                        <ReferenceLine y={ranges.before.low} stroke="var(--color-danger)" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: `Low ${ranges.before.low}`, position: 'insideBottomRight', fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <ReferenceLine y={ranges.before.high} stroke="var(--color-warning)" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: `Pre-meal max ${ranges.before.high}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <ReferenceLine y={ranges.after.high} stroke="var(--color-danger)" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: `Post-meal max ${ranges.after.high}`, position: 'insideTopRight', fontSize: 10, fill: 'var(--color-text-muted)' }} />
                        <Line type="monotone" dataKey="before" name="Before meal" stroke={primary} strokeWidth={2} connectNulls dot={renderDot(primary)} activeDot={{ r: 6 }} isAnimationActive={false} />
                        <Line type="monotone" dataKey="after" name="After meal" stroke={AFTER_COLOR} strokeWidth={2} connectNulls dot={renderDot(AFTER_COLOR)} activeDot={{ r: 6 }} isAnimationActive={false} />
                    </LineChart>
                </ResponsiveContainer>
                <div className="mt-1 text-center text-[11px] text-text-muted">Red-ringed points are outside the reference range · times shown in PKT</div>
            </div>
        )
    }

    return (
        <ChartCard
            title="Blood Glucose"
            subtitle={`Before / after meal readings (mg/dL) · last ${days} days`}
            extra={range}
        >
            {body}
        </ChartCard>
    )
}
