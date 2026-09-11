import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Progress, Button } from 'antd'
import {
    TeamOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    WarningOutlined,
    RiseOutlined,
    ArrowRightOutlined,
    WarningFilled,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import DonutChart from '../../../components/charts/DonutChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'

export default function Dashboard() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [clients, setClients] = useState([])

    useEffect(() => {
        async function load() {
            try {
                const [s, c] = await Promise.all([
                    api.get('/stats/trainer'),
                    api.get('/clients'),
                ])
                setStats(s)
                setClients(c.items || [])
            } catch (err) {
                console.error('Dashboard load failed:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading || !stats) return <LoadingSkeleton cards={6} />

    const cards = [
        { icon: <TeamOutlined />, label: 'Total Clients', value: stats.total, hint: `${stats.active} active` },
        { icon: <CheckCircleOutlined />, label: 'Active Clients', value: stats.active },
        { icon: <ClockCircleOutlined />, label: 'Pending Follow-ups', value: stats.pendingFollowUps, accent: 'var(--color-warning)' },
        { icon: <RiseOutlined />, label: 'Completed Follow-ups', value: stats.completedFollowUps, accent: 'var(--color-success)' },
        { icon: <WarningOutlined />, label: 'Needs Attention', value: stats.attention, accent: 'var(--color-danger)' },
    ]

    // Build donut data from actual clients
    const goalCounts = {}
    const planCounts = {}
    clients.forEach((c) => {
        goalCounts[c.goal] = (goalCounts[c.goal] || 0) + 1
        planCounts[c.plan] = (planCounts[c.plan] || 0) + 1
    })
    const clientGoalData = Object.entries(goalCounts).map(([name, value]) => ({ name, value }))
    const clientPlanData = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

    const attentionClients = clients.filter((c) => c.progress < 45 && c.status === 'active')
    const progressClients = [...clients].sort((a, b) => (b.progress || 0) - (a.progress || 0)).slice(0, 5)

    return (
        <div>
            <PageHeader
                title={`Welcome back, ${(user?.name || 'Trainer').split(' ')[0]} 👋`}
                subtitle="Here's what needs your attention today."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Clients by Goal" subtitle="What your roster is training for">
                    <DonutChart data={clientGoalData} centerLabel="clients" />
                </ChartCard>
                <ChartCard title="Clients by Plan" subtitle="Membership tier split">
                    <DonutChart data={clientPlanData} centerLabel="clients" />
                </ChartCard>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="app-card animate-rise flex flex-col p-5 lg:col-span-1">
                    <div className="mb-4 flex items-center gap-2">
                        <WarningFilled style={{ color: 'var(--color-warning)' }} />
                        <h3 className="section-title m-0">Needs Attention</h3>
                    </div>
                    {attentionClients.length === 0 ? (
                        <p className="text-sm text-text-muted">Everyone is on track. Nice work.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {attentionClients.map((c) => (
                                <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-secondary">
                                    <UserAvatar name={c.name} color={c.avatarColor} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-text-primary">{c.name}</div>
                                        <div className="text-xs" style={{ color: 'var(--color-warning)' }}>Low completion</div>
                                    </div>
                                    <ArrowRightOutlined style={{ color: 'var(--color-text-muted)' }} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <ChartCard className="lg:col-span-2" title="Client Progress Overview" subtitle="Top movers">
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
                                        <Progress percent={c.progress || 0} showInfo={false} strokeColor="var(--color-primary)" />
                                        <span className="w-10 text-right text-xs font-bold text-text-primary">{c.progress || 0}%</span>
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
