import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { useTheme } from '../../context/ThemeContext'
import { categorical, STATUS_COLORS } from './palette'
import ChartTooltip from './ChartTooltip'

// Donut chart used for payment status and client distribution.
export default function DonutChart({ data, height = 260, useStatusColors = false, centerLabel }) {
    const { primary } = useTheme()
    const colors = categorical(primary)
    const total = data.reduce((s, d) => s + d.value, 0)

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={height}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="62%"
                        outerRadius="88%"
                        paddingAngle={2}
                        stroke="none"
                    >
                        {data.map((entry, i) => (
                            <Cell
                                key={i}
                                fill={useStatusColors ? STATUS_COLORS[entry.key] || colors[i % colors.length] : colors[i % colors.length]}
                            />
                        ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                        iconType="circle"
                        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {centerLabel && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: -18 }}>
                    <div className="text-2xl font-extrabold text-text-primary">{total}</div>
                    <div className="text-xs text-text-muted">{centerLabel}</div>
                </div>
            )}
        </div>
    )
}
