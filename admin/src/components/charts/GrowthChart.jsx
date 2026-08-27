import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import ChartTooltip from './ChartTooltip'

// Area chart for client growth over time.
export default function GrowthChart({ data, dataKey = 'clients', height = 280 }) {
    const { primary } = useTheme()
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                    <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primary} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    name="Clients"
                    stroke={primary}
                    strokeWidth={2.5}
                    fill="url(#growthFill)"
                    activeDot={{ r: 5 }}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
