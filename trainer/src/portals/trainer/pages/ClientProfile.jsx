import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tabs, Progress, Checkbox, Tag } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    PhoneOutlined,
    AimOutlined,
    MessageOutlined,
    CalendarOutlined,
} from '@ant-design/icons'
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
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import EmptyState from '../../../components/common/EmptyState'
import MealCard from '../components/MealCard'
import ExerciseDayCard from '../components/ExerciseDayCard'
import {
    getClient,
    sampleDietPlan,
    sampleExercisePlan,
    clientChecklist,
    weeklyCompletion,
    weightProgress,
} from '../../../services/mockData'

export default function ClientProfile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { primary } = useTheme()
    const client = getClient(id)

    const completion = useMemo(() => {
        const done = clientChecklist.filter((t) => t.done).length
        return Math.round((done / clientChecklist.length) * 100)
    }, [])

    if (!client) {
        return (
            <div className="app-card">
                <EmptyState
                    title="Client not found"
                    description="This client may have been removed."
                    action={<Button type="primary" onClick={() => navigate('/clients')}>Back to clients</Button>}
                />
            </div>
        )
    }

    const overview = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-4">Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><MailOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.email}</span></div>
                    <div className="flex items-center gap-3"><PhoneOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.phone}</span></div>
                    <div className="flex items-center gap-3"><AimOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Goal: {client.goal}</span></div>
                    <div className="flex items-center gap-3"><CalendarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Next follow-up: {client.nextFollowUp}</span></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="text-lg font-extrabold text-text-primary">{client.weight}kg</div>
                        <div className="text-[11px] text-text-muted">Current</div>
                    </div>
                    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="text-lg font-extrabold text-text-primary">{client.target}kg</div>
                        <div className="text-[11px] text-text-muted">Target</div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <ChartCard title="Weight Progress" subtitle="Last 8 weeks (kg)">
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={weightProgress} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="weight" name="Weight" stroke={primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    )

    const dietTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">{sampleDietPlan.title}</h3>
                <Button type="primary" onClick={() => navigate('/diet-plans')}>Edit plan</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sampleDietPlan.meals.map((m) => (
                    <MealCard key={m.id} meal={m} />
                ))}
            </div>
        </div>
    )

    const exerciseTab = (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="section-title m-0">{sampleExercisePlan.title}</h3>
                <Button type="primary" onClick={() => navigate('/exercise-plans')}>Edit plan</Button>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {sampleExercisePlan.days.map((d) => (
                    <ExerciseDayCard key={d.id} day={d} />
                ))}
            </div>
        </div>
    )

    const progressTab = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly Completion" subtitle="Daily activity completion (%)">
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

            <ChartCard title="Today's Checklist" subtitle={`${completion}% complete`}>
                <div className="mb-3">
                    <Progress percent={completion} strokeColor="var(--color-primary)" />
                </div>
                <div className="flex flex-col gap-2">
                    {clientChecklist.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                            <Checkbox checked={t.done} disabled />
                            <span className={`text-sm ${t.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{t.label}</span>
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>
    )

    const followUpTab = (
        <div className="app-card p-6">
            <h3 className="section-title mb-4">Follow-up history</h3>
            <div className="flex flex-col gap-3">
                {[
                    { date: client.lastFollowUp, note: 'Reviewed weekly progress, adjusted calories.', status: 'completed' },
                    { date: client.nextFollowUp, note: 'Upcoming check-in.', status: client.followUp < 0 ? 'overdue' : 'pending' },
                ].map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div>
                            <div className="text-sm font-semibold text-text-primary">{f.date}</div>
                            <div className="text-xs text-text-muted">{f.note}</div>
                        </div>
                        <Tag color={f.status === 'completed' ? 'green' : f.status === 'overdue' ? 'red' : 'orange'}>{f.status}</Tag>
                    </div>
                ))}
            </div>
            <Button type="primary" className="mt-4" onClick={() => navigate('/follow-ups')}>Manage follow-ups</Button>
        </div>
    )

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>
                Back to clients
            </Button>

            <div className="app-card mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={client.name} color={client.avatarColor} size={64} />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="m-0 text-xl font-extrabold text-text-primary md:text-2xl">{client.name}</h1>
                                <StatusBadge status={client.status} />
                            </div>
                            <div className="mt-1 text-sm text-text-muted">{client.goal} · {client.plan} plan</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button icon={<MessageOutlined />} onClick={() => navigate('/messages')}>Message</Button>
                        <Button type="primary" onClick={() => navigate('/follow-ups')}>Schedule follow-up</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Progress" value={`${client.progress}%`} accent="var(--color-success)" />
                <StatCard label="Current Weight" value={`${client.weight}kg`} hint={`Target ${client.target}kg`} />
                <StatCard label="Plan" value={client.plan} />
                <StatCard label="Next Follow-up" value={client.nextFollowUp} />
            </div>

            <div className="mt-6">
                <Tabs
                    items={[
                        { key: 'overview', label: 'Overview', children: overview },
                        { key: 'diet', label: 'Diet Plan', children: dietTab },
                        { key: 'exercise', label: 'Exercise Plan', children: exerciseTab },
                        { key: 'progress', label: 'Progress', children: progressTab },
                        { key: 'followups', label: 'Follow-ups', children: followUpTab },
                    ]}
                />
            </div>
        </div>
    )
}
