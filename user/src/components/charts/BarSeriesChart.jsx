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

// Generic single-series bar chart. Latest bar highlighted; optional per-bar color via `colorFor`.
export default function BarSeriesChart({
    data,
    dataKey = 'value',
    xKey = 'label',
    name = 'Value',
    height = 260,
    domain,
    tickFormatter,
    valueFormatter,
    colorFor,
}) {
    const { primary } = useTheme()
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                    domain={domain}
                    tickFormatter={tickFormatter}
                    tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                />
                <Tooltip cursor={{ fill: 'var(--color-surface-secondary)' }} content={<ChartTooltip formatter={valueFormatter} />} />
                <Bar dataKey={dataKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={44}>
                    {data.map((entry, i) => (
                        <Cell
                            key={i}
                            fill={
                                colorFor
                                    ? colorFor(entry, i)
                                    : i === data.length - 1
                                        ? primary
                                        : 'var(--color-primary-soft)'
                            }
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    )
}
