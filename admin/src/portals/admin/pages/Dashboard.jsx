import { Skeleton } from 'antd'
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
import AsyncSection from '../../../components/feedback/AsyncSection'
import SectionError from '../../../components/feedback/SectionError'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useAuth } from '../../../context/AuthContext'

const money = (v) => `${(v || 0).toLocaleString()}`

// Placeholder tiles while the headline stats load.
const StatCardSkeletons = ({ count }) =>
    Array.from({ length: count }).map((_, i) => (
        <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} /></div>
    ))

// Trainer capacity list — shared by the admin and member dashboards.
function TrainerCapacity({ trainersRes, emptyText }) {
    const trainerList = trainersRes.data?.items || []
    return (
        <AsyncSection loading={trainersRes.loading} error={trainersRes.error} onRetry={trainersRes.reload} errorTitle="Couldn't load trainers">
            {trainerList.length === 0 ? (
                <div className="py-6 text-center text-sm text-text-muted">{emptyText}</div>
            ) : (
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
            )}
        </AsyncSection>
    )
}

export default function Dashboard() {
    const { user } = useAuth()
    const isMember = user?.role === 'member'

    // Each block below is its own request — the headline cards, the revenue
    // chart and the trainer list render (or fail) independently.
    const statsRes = useAsyncData(() => api.get(isMember ? '/stats/member' : '/stats/admin'), [isMember])
    const revenueRes = useAsyncData(() => api.get('/stats/admin/revenue-trend'), [], { enabled: !isMember })
    const trainersRes = useAsyncData(() => api.get('/trainers'), [isMember])
    const stats = statsRes.data

    if (isMember) {
        return (
            <div>
                <PageHeader title="Dashboard" subtitle="Your trainers and clients at a glance." />

                {statsRes.error ? (
                    <SectionError title="Couldn't load your stats" error={statsRes.error} onRetry={statsRes.reload} />
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {statsRes.loading || !stats ? <StatCardSkeletons count={4} /> : (
                            <>
                                <StatCard icon={<UsergroupAddOutlined />} label="Clients" value={stats.clientLimit ? `${stats.totalClients} / ${stats.clientLimit}` : stats.totalClients} hint={stats.clientLimit && stats.totalClients >= stats.clientLimit ? 'Plan limit reached' : `${stats.activeClients} active`} />
                                <StatCard icon={<IdcardOutlined />} label="Trainers" value={`${stats.totalTrainers} / ${stats.trainerLimit}`} hint={stats.totalTrainers >= stats.trainerLimit ? 'Limit reached' : `${stats.trainerLimit - stats.totalTrainers} slots left`} />
                                <StatCard icon={<ThunderboltOutlined />} label="Available Capacity" value={stats.availableCapacity} hint={`${stats.usedCapacity}/${stats.totalCapacity} slots used`} />
                                <StatCard icon={<CheckCircleOutlined />} label="Active Clients" value={stats.activeClients} />
                            </>
                        )}
                    </div>
                )}

                <div className="mt-6">
                    <ChartCard title="Trainer Capacity" subtitle="Live utilisation across your team">
                        <TrainerCapacity trainersRes={trainersRes} emptyText="No trainers assigned to you yet." />
                    </ChartCard>
                </div>
            </div>
        )
    }

    const cards = stats ? [
        { icon: <UsergroupAddOutlined />, label: 'Total Clients', value: stats.totalClients, hint: `${stats.activeClients} active` },
        { icon: <IdcardOutlined />, label: 'Total Trainers', value: stats.totalTrainers, hint: `${stats.activeTrainers} active now` },
        { icon: <ThunderboltOutlined />, label: 'Available Capacity', value: stats.availableCapacity, hint: `${stats.usedCapacity}/${stats.totalCapacity} slots used` },
        { icon: <DollarOutlined />, label: 'Total Revenue', value: money(stats.totalRevenue), hint: 'Paid this period' },
        { icon: <CheckCircleOutlined />, label: 'Active Clients', value: stats.activeClients },
        { icon: <TeamOutlined />, label: 'Active Trainers', value: stats.activeTrainers, hint: `of ${stats.totalTrainers} total` },
        { icon: <ClockCircleOutlined />, label: 'Pending Payments', value: money(stats.pendingAmount), hint: `${stats.pendingCount} invoices` },
        { icon: <RiseOutlined />, label: 'Completed Payments', value: stats.paidCount },
    ] : []

    // Shared by every stats-driven card below.
    const statsProps = { loading: statsRes.loading, error: statsRes.error, onRetry: statsRes.reload, errorTitle: "Couldn't load platform stats" }

    return (
        <div>
            <PageHeader
                title="Dashboard"
                subtitle="Platform overview and performance at a glance."
            />

            {statsRes.error ? (
                <SectionError title="Couldn't load platform stats" error={statsRes.error} onRetry={statsRes.reload} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {statsRes.loading ? <StatCardSkeletons count={8} /> : cards.map((c, i) => (
                        <StatCard key={i} {...c} />
                    ))}
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                    className="lg:col-span-2"
                    title="Client Growth"
                    subtitle="New clients onboarded per month"
                >
                    <AsyncSection {...statsProps} rows={6}>
                        <GrowthChart data={stats?.clientGrowth || []} />
                    </AsyncSection>
                </ChartCard>
                <ChartCard title="Payment Status" subtitle="Distribution by state">
                    <AsyncSection {...statsProps} rows={6}>
                        <DonutChart data={stats?.paymentStatusData || []} useStatusColors centerLabel="payments" />
                    </AsyncSection>
                </ChartCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                    className="lg:col-span-2"
                    title="Revenue"
                    subtitle="Monthly revenue trend"
                >
                    <AsyncSection loading={revenueRes.loading} error={revenueRes.error} onRetry={revenueRes.reload} errorTitle="Couldn't load the revenue trend" rows={6}>
                        <RevenueChart data={revenueRes.data?.items || []} />
                    </AsyncSection>
                </ChartCard>
                <ChartCard title="Client Distribution" subtitle="Clients per trainer">
                    <AsyncSection {...statsProps} rows={6}>
                        <DonutChart data={stats?.clientDistribution || []} centerLabel="clients" />
                    </AsyncSection>
                </ChartCard>
            </div>

            <div className="mt-6">
                <ChartCard title="Trainer Capacity" subtitle="Live utilisation across your team">
                    <TrainerCapacity trainersRes={trainersRes} emptyText="No trainers yet." />
                </ChartCard>
            </div>
        </div>
    )
}
