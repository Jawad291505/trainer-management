import {
    ResponsiveContainer,
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell,
} from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import ProgressRing from '../components/ProgressRing'
import {
    currentClient,
    weightProgress,
    weeklyCompletion,
    complianceData,
} from '../../../services/mockData'

export default function MyProgress() {
    const { primary } = useTheme()
    const lost = (currentClient.startWeight - currentClient.weight).toFixed(1)
    const toGo = (currentClient.weight - currentClient.target).toFixed(1)

    return (
        <div>
            <PageHeader title="My Progress" subtitle="Look how far you've come. Keep it up!">
                <RequestCorrection area="progress" />
            </PageHeader>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Weight Lost" value={`${lost}kg`} accent="var(--color-success)" hint="Since you started" />
                <StatCard label="Current Weight" value={`${currentClient.weight}kg`} />
                <StatCard label="To Goal" value={`${toGo}kg`} hint={`Target ${currentClient.target}kg`} />
                <StatCard label="Goal Progress" value={`${currentClient.progress}%`} accent="var(--color-primary)" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Weight Journey" subtitle="Last 8 weeks (kg)">
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={weightProgress} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <defs>
                                <linearGradient id="wline" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor={primary} />
                                    <stop offset="100%" stopColor="var(--color-success)" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="weight" name="Weight" stroke="url(#wline)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Weekly Consistency" subtitle="Avg. completion">
                    <div className="flex h-full flex-col items-center justify-center">
                        <ProgressRing
                            value={Math.round(weeklyCompletion.reduce((s, d) => s + d.pct, 0) / weeklyCompletion.length)}
                            size={150}
                            sublabel="this week"
                        />
                        <p className="mt-4 text-center text-sm text-text-secondary">
                            You're building a strong habit. Consistency beats intensity!
                        </p>
                    </div>
                </ChartCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Daily Completion" subtitle="This week (%)">
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={weeklyCompletion} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={40} />
                            <Tooltip cursor={{ fill: 'var(--color-surface-secondary)' }} content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                            <Bar dataKey="pct" name="Completion" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                {weeklyCompletion.map((e, i) => (
                                    <Cell key={i} fill={e.pct >= 80 ? 'var(--color-success)' : e.pct >= 60 ? primary : 'var(--color-warning)'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Compliance" subtitle="How well you're following the plan">
                    <div className="flex flex-col gap-4 pt-2">
                        {complianceData.map((c) => (
                            <div key={c.name}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                    <span className="font-medium text-text-secondary">{c.name}</span>
                                    <span className="font-bold text-text-primary">{c.value}%</span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-surface-secondary)' }}>
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${c.value}%`,
                                            background: c.value >= 85 ? 'var(--color-success)' : c.value >= 70 ? 'var(--color-primary)' : 'var(--color-warning)',
                                            transition: 'width 0.6s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    )
}
