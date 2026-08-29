import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Progress, Button } from 'antd'
import {
    TeamOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    WarningOutlined,
    RiseOutlined,
    ArrowRightOutlined,
    WarningFilled,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import DonutChart from '../../../components/charts/DonutChart'
import GrowthChart from '../../../components/charts/GrowthChart'
import BarSeriesChart from '../../../components/charts/BarSeriesChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import ScheduleTimeline from '../components/ScheduleTimeline'
import {
    getStats,
    clients,
    currentTrainer,
    clientGoalData,
    clientPlanData,
    followUpStatusData,
    weeklySessions,
    clientProgressTrend,
} from '../../../services/mockData'
import { useSchedule } from '../../../context/ScheduleContext'

export default function Dashboard() {
    const navigate = useNavigate()
    const { today: todaySchedule } = useSchedule()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)

    useEffect(() => {
        const t = setTimeout(() => {
            setStats(getStats())
            setLoading(false)
        }, 450)
        return () => clearTimeout(t)
    }, [])

    if (loading || !stats) return <LoadingSkeleton cards={6} />

    const cards = [
        { icon: <TeamOutlined />, label: 'Total Clients', value: stats.total, hint: `${stats.active} active` },
        { icon: <CheckCircleOutlined />, label: 'Active Clients', value: stats.active },
        { icon: <ClockCircleOutlined />, label: 'Pending Follow-ups', value: stats.pendingFollowUps, accent: 'var(--color-warning)' },
        { icon: <CalendarOutlined />, label: "Today's Sessions", value: stats.todaySessions },
        { icon: <RiseOutlined />, label: 'Completed Follow-ups', value: stats.completedFollowUps, accent: 'var(--color-success)' },
        { icon: <WarningOutlined />, label: 'Needs Attention', value: stats.attention, accent: 'var(--color-danger)' },
    ]

    const attentionClients = clients.filter((c) => c.attention)
    const progressClients = [...clients].sort((a, b) => b.progress - a.progress).slice(0, 5)

    return (
        <div>
            <PageHeader
                title={`Welcome back, ${currentTrainer.name.split(' ')[0]} 👋`}
                subtitle="Here's what needs your attention today."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((c, i) => (
                    <StatCard key={i} {...c} />
                ))}
            </div>

            {/* Client mix + follow-up pipeline */}
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard title="Clients by Goal" subtitle="What your roster is training for">
                    <DonutChart data={clientGoalData} centerLabel="clients" />
                </ChartCard>
                <ChartCard title="Clients by Plan" subtitle="Membership tier split">
                    <DonutChart data={clientPlanData} centerLabel="clients" />
                </ChartCard>
                <ChartCard title="Follow-up Pipeline" subtitle="Where check-ins stand">
                    <DonutChart data={followUpStatusData} centerLabel="follow-ups" />
                </ChartCard>
            </div>

            {/* Activity + progress trends */}
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Sessions This Week" subtitle="Sessions delivered per day">
                    <BarSeriesChart
                        data={weeklySessions}
                        dataKey="sessions"
                        xKey="day"
                        name="Sessions"
                        domain={[0, 'dataMax + 1']}
                        valueFormatter={(v) => `${v} sessions`}
                    />
                </ChartCard>
                <ChartCard title="Avg Client Progress" subtitle="Mean goal completion by month">
                    <GrowthChart
                        data={clientProgressTrend}
                        dataKey="progress"
                        name="Avg progress"
                        height={260}
                    />
                </ChartCard>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Today's schedule */}
                <ChartCard
                    className="lg:col-span-2"
                    title="Today's Schedule"
                    subtitle="Your sessions and follow-ups"
                    extra={
                        <Button type="text" className="text-primary" onClick={() => navigate('/schedule')}>
                            View all <ArrowRightOutlined />
                        </Button>
                    }
                >
                    <ScheduleTimeline items={todaySchedule} />
                </ChartCard>

                {/* Needs attention */}
                <div className="app-card animate-rise flex flex-col p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <WarningFilled style={{ color: 'var(--color-warning)' }} />
                        <h3 className="section-title m-0">Needs Attention</h3>
                    </div>
                    {attentionClients.length === 0 ? (
                        <p className="text-sm text-text-muted">Everyone is on track. Nice work.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {attentionClients.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => navigate(`/clients/${c.id}`)}
                                    className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-secondary"
                                >
                                    <UserAvatar name={c.name} color={c.avatarColor} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-text-primary">{c.name}</div>
                                        <div className="text-xs" style={{ color: 'var(--color-warning)' }}>
                                            {c.followUp < 0 ? `${Math.abs(c.followUp)}d overdue` : 'Low completion'}
                                        </div>
                                    </div>
                                    <ArrowRightOutlined style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Client progress overview */}
            <div className="mt-6">
                <ChartCard title="Client Progress Overview" subtitle="Top movers this week">
                    <div className="flex flex-col gap-4">
                        {progressClients.map((c) => (
                            <div key={c.id} className="flex items-center gap-4">
                                <UserAvatar name={c.name} color={c.avatarColor} size={40} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="truncate text-sm font-semibold text-text-primary">{c.name}</span>
                                        <span className="text-xs text-text-muted">{c.goal}</span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-3">
                                        <Progress percent={c.progress} showInfo={false} strokeColor="var(--color-primary)" />
                                        <span className="w-10 text-right text-xs font-bold text-text-primary">{c.progress}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChartCard>
            </div>
        </div>
    )
}
