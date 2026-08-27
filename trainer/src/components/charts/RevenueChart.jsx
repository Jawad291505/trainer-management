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

const money = (v) => `$${(v / 1000).toFixed(1)}k`

// Bar chart for monthly revenue. Latest bar highlighted in the accent.
export default function RevenueChart({ data, height = 280 }) {
    const { primary } = useTheme()
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={money} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={48} />
                <Tooltip cursor={{ fill: 'var(--color-surface-secondary)' }} content={<ChartTooltip formatter={(v) => `$${v.toLocaleString()}`} />} />
                <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {data.map((entry, i) => (
                        <Cell key={i} fill={i === data.length - 1 ? primary : 'var(--color-primary-soft)'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
