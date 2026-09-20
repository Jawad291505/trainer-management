import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import ChartTooltip from './ChartTooltip'

// `currency` is the prefix on the axis and tooltip ('$' by default, 'PKR ' for member subscriptions).
const money = (v, currency) => `${currency}${(v / 1000).toFixed(1)}k`

// Bar chart for monthly revenue. Latest bar highlighted in the accent.
export default function RevenueChart({ data, height = 280, currency = '$' }) {
    const { primary } = useTheme()
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => money(v, currency)} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'var(--color-surface-secondary)' }} content={<ChartTooltip formatter={(v) => `${currency}${v.toLocaleString()}`} />} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={i === data.length - 1 ? primary : 'var(--color-primary-soft)'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
