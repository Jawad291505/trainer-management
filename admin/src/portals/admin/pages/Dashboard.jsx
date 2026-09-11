import { useEffect, useState } from 'react'
import {
    TeamOutlined,
    IdcardOutlined,
    DollarOutlined,
    ClockCircleOutlined,
    RiseOutlined,
    CheckCircleOutlined,
    UsergroupAddOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import GrowthChart from '../../../components/charts/GrowthChart'
import RevenueChart from '../../../components/charts/RevenueChart'
import DonutChart from '../../../components/charts/DonutChart'
import CapacityBar from '../../../components/common/CapacityBar'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'

const money = (v) => `${(v || 0).toLocaleString()}`

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [revTrend, setRevTrend] = useState([])
    const [trainerList, setTrainerList] = useState([])

    useEffect(() => {
        async function load() {
            try {
                const [s, rev, tr] = await Promise.all([
                    api.get('/stats/admin'),
                    api.get('/stats/admin/revenue-trend'),
                    api.get('/trainers'),
                ])
                setStats(s)
                setRevTrend(rev.items || [])
                setTrainerList(tr.items || [])
            } catch (err) {
                console.error('Dashboard load failed:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading || !stats) return <LoadingSkeleton />

    const cards = [
        { icon: <UsergroupAddOutlined />, label: 'Total Clients', value: stats.totalClients, hint: `${stats.activeClients} active` },
        { icon: <IdcardOutlined />, label: 'Total Trainers', value: stats.totalTrainers, hint: `${stats.activeTrainers} active now` },
        { icon: <ThunderboltOutlined />, label: 'Available Capacity', value: stats.availableCapacity, hint: `${stats.usedCapacity}/${stats.totalCapacity} slots used` },
        { icon: <DollarOutlined />, label: 'Total Revenue', value: money(stats.totalRevenue), hint: 'Paid this period' },
        { icon: <CheckCircleOutlined />, label: 'Active Clients', value: stats.activeClients },
        { icon: <TeamOutlined />, label: 'Active Trainers', value: stats.activeTrainers, hint: `of ${stats.totalTrainers} total` },
        { icon: <ClockCircleOutlined />, label: 'Pending Payments', value: money(stats.pendingAmount), hint: `${stats.pendingCount} invoices` },
        { icon: <RiseOutlined />, label: 'Completed Payments', value: stats.paidCount },
    ]

    // Build growth chart from stats if available
    const clientGrowth = stats.clientGrowth || []

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Platform overview and performance at a glance."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c, i) => (
                    <StatCard key={i} {...c} />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                    className="lg:col-span-2"
                    title="Client Growth"
                    subtitle="New clients onboarded per month"
                >
                    <GrowthChart data={clientGrowth} />
                </ChartCard>
                <ChartCard title="Payment Status" subtitle="Distribution by state">
                    <DonutChart data={stats.paymentStatusData || []} useStatusColors centerLabel="payments" />
                </ChartCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                    className="lg:col-span-2"
                    title="Revenue"
                    subtitle="Monthly revenue trend"
                >
                    <RevenueChart data={revTrend} />
                </ChartCard>
                <ChartCard title="Client Distribution" subtitle="Clients per trainer">
                    <DonutChart data={stats.clientDistribution || []} centerLabel="clients" />
                </ChartCard>
            </div>

            <div className="mt-6">
                <ChartCard title="Trainer Capacity" subtitle="Live utilisation across your team">
                    <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
                        {trainerList.map((t) => (
                            <div key={t.id} className="flex items-center gap-3">
                                <UserAvatar name={t.name} color={t.avatarColor} size={40} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="truncate text-sm font-semibold text-text-primary">{t.name}</span>
                                        <span className="text-xs text-text-muted">{t.specialization}</span>
                                    </div>
                                    <div className="mt-1.5">
                                        <CapacityBar current={t.clients} max={t.capacity} size="sm" />
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
