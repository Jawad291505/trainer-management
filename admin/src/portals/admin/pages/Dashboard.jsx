import { useNavigate } from 'react-router-dom'
import { Skeleton, Tag, Progress, Rate } from 'antd'
import dayjs from 'dayjs'
import {
    TeamOutlined,
    IdcardOutlined,
    DollarOutlined,
    ClockCircleOutlined,
    RiseOutlined,
    CheckCircleOutlined,
    UsergroupAddOutlined,
    ThunderboltOutlined,
    FileDoneOutlined,
    WarningOutlined,
    StarOutlined,
    EditOutlined,
    SolutionOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import GrowthChart from '../../../components/charts/GrowthChart'
import RevenueChart from '../../../components/charts/RevenueChart'
import DonutChart from '../../../components/charts/DonutChart'
import CapacityBar from '../../../components/common/CapacityBar'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import AsyncSection from '../../../components/feedback/AsyncSection'
import SectionError from '../../../components/feedback/SectionError'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { useAuth } from '../../../context/AuthContext'

const money = (v, currency = 'PKR') => `${currency} ${(v || 0).toLocaleString()}`
const fmtDate = (d) => (d ? dayjs(d).format('D MMM YYYY') : '—')

const SUB_STATUS = {
    active: { label: 'Active', color: 'green' },
    expiring: { label: 'Expiring soon', color: 'gold' },
    expired: { label: 'Expired', color: 'red' },
    inactive: { label: 'Inactive', color: 'default' },
    no_plan: { label: 'No plan', color: 'default' },
}
const SubTag = ({ status }) => {
    const s = SUB_STATUS[status] || SUB_STATUS.no_plan
    return <Tag color={s.color} style={{ borderRadius: 999, margin: 0 }}>{s.label}</Tag>
}

// "in 3 days" / "2 days ago" for a plan expiry.
const expiryText = (daysLeft) => {
    if (daysLeft == null) return 'No expiry'
    if (daysLeft === 0) return 'Expires today'
    return daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : `Expired ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`
}

// Placeholder tiles while the headline stats load.
const StatCardSkeletons = ({ count }) =>
    Array.from({ length: count }).map((_, i) => (
        <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} /></div>
    ))

// Chart body that shows a hint instead of an empty plot when there is nothing to draw yet.
const OrEmpty = ({ empty, text, children }) =>
    empty ? <div className="py-16 text-center text-sm text-text-muted">{text}</div> : children

// Heading + body for table sections (DataTable already draws its own card).
const TableSection = ({ title, subtitle, children }) => (
    <div>
        <div className="mb-3">
            <h3 className="section-title m-0">{title}</h3>
            {subtitle && <p className="mt-0.5 mb-0 text-xs text-text-muted">{subtitle}</p>}
        </div>
        {children}
    </div>
)

// ---- Super Admin: the Members business ----
function AdminDashboard() {
    const navigate = useNavigate()
    const res = useAsyncData(() => api.get('/stats/admin/dashboard'), [])
    const d = res.data
    const cur = d?.currency || 'PKR'
    const props = { loading: res.loading, error: res.error, onRetry: res.reload, errorTitle: "Couldn't load the dashboard" }

    const cards = d ? [
        { icon: <IdcardOutlined />, label: 'Total Members', value: d.totalMembers, hint: `${d.activeMembers} active · ${d.newMembers30d} joined in the last 30 days` },
        { icon: <CheckCircleOutlined />, label: 'Active Subscriptions', value: d.subscriptions.active + d.subscriptions.expiring, hint: `${d.subscriptions.no_plan} without a plan` },
        { icon: <DollarOutlined />, label: 'Total Revenue', value: money(d.totalRevenue, cur), hint: `${d.approvedPayments} approved payments · ${money(d.revenueThisMonth, cur)} this month` },
        { icon: <RiseOutlined />, label: 'Monthly Recurring', value: money(d.monthlyRecurring, cur), hint: 'From members currently subscribed' },
        { icon: <FileDoneOutlined />, label: 'Pending Approvals', value: d.pendingApprovals, hint: d.pendingApprovals ? `${money(d.pendingAmount, cur)} awaiting review` : 'Nothing waiting', accent: 'var(--color-warning)' },
        { icon: <ClockCircleOutlined />, label: 'Expiring Soon', value: d.subscriptions.expiring, hint: 'Within 7 days', accent: 'var(--color-warning)' },
        { icon: <WarningOutlined />, label: 'Expired', value: d.subscriptions.expired, hint: 'Plan has lapsed', accent: 'var(--color-danger)' },
        { icon: <SolutionOutlined />, label: 'Platform Trainers', value: d.totalTrainers, hint: `${d.totalClients} clients in total` },
    ] : []

    const memberCell = (name, r) => (
        <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/members/${r.id}`)}>
            <UserAvatar name={name || ''} color={r.avatarColor} size={34} />
            <div className="min-w-0">
                <div className="truncate font-semibold text-text-primary">{name}</div>
                <div className="truncate text-xs text-text-muted">{r.email}</div>
            </div>
        </div>
    )

    const attentionColumns = [
        { title: 'Member', dataIndex: 'name', render: memberCell },
        { title: 'Plan', dataIndex: 'plan', width: 110, render: (p) => <span className="text-text-secondary">{p || '—'}</span> },
        {
            title: 'Subscription', dataIndex: 'subscriptionStatus', width: 190,
            render: (s, r) => (
                <div>
                    <SubTag status={s} />
                    <div className="mt-1 text-xs text-text-muted">{expiryText(r.daysLeft)}</div>
                </div>
            ),
        },
    ]

    const recentColumns = [
        { title: 'Member', dataIndex: 'name', render: memberCell },
        { title: 'Plan', dataIndex: 'plan', width: 100, render: (p) => <span className="text-text-secondary">{p || '—'}</span> },
        { title: 'Trainers', width: 90, render: (_, r) => <span className="text-text-secondary">{r.trainerCount}{r.trainerLimit ? ` / ${r.trainerLimit}` : ''}</span> },
        { title: 'Clients', width: 90, render: (_, r) => <span className="text-text-secondary">{r.clientCount}{r.clientLimit ? ` / ${r.clientLimit}` : ''}</span> },
        { title: 'Joined', dataIndex: 'joinDate', width: 120, render: (v) => <span className="text-text-secondary">{fmtDate(v)}</span> },
    ]

    return (
        <div>
            <PageHeader title="Dashboard" subtitle="Your members, their subscriptions and revenue at a glance." />

            {res.error ? (
                <SectionError title="Couldn't load the dashboard" error={res.error} onRetry={res.reload} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {res.loading ? <StatCardSkeletons count={8} /> : cards.map((c, i) => <StatCard key={i} {...c} />)}
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Member Growth" subtitle="New members joined per month">
                    <AsyncSection {...props} rows={6}>
                        <GrowthChart data={d?.memberGrowth || []} dataKey="members" name="Members" />
                    </AsyncSection>
                </ChartCard>
                <ChartCard title="Subscription Status" subtitle="Members by plan state">
                    <AsyncSection {...props} rows={6}>
                        <OrEmpty empty={!d?.subscriptionData?.length} text="No members yet.">
                            <DonutChart data={d?.subscriptionData || []} useStatusColors centerLabel="members" />
                        </OrEmpty>
                    </AsyncSection>
                </ChartCard>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Subscription Revenue" subtitle="Approved member payments per month">
                    <AsyncSection {...props} rows={6}>
                        <RevenueChart data={d?.revenueTrend || []} currency={`${cur} `} />
                    </AsyncSection>
                </ChartCard>
                <ChartCard title="Plan Distribution" subtitle="Members per subscription plan">
                    <AsyncSection {...props} rows={6}>
                        <OrEmpty empty={!d?.planDistribution?.length} text="No members yet.">
                            <DonutChart data={d?.planDistribution || []} centerLabel="members" />
                        </OrEmpty>
                    </AsyncSection>
                </ChartCard>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <TableSection title="Needs Attention" subtitle="Plans that have lapsed or lapse within 7 days">
                    <AsyncSection {...props} rows={4}>
                        {d?.needsAttention?.length ? (
                            <DataTable columns={attentionColumns} dataSource={d.needsAttention} pagination={false} scrollX={520} />
                        ) : (
                            <EmptyState icon={<CheckCircleOutlined />} title="All subscriptions are healthy" description="No member's plan is expiring or expired." />
                        )}
                    </AsyncSection>
                </TableSection>
                <TableSection title="Recent Members" subtitle="Newest members and the team they run">
                    <AsyncSection {...props} rows={4}>
                        {d?.recentMembers?.length ? (
                            <DataTable columns={recentColumns} dataSource={d.recentMembers} pagination={false} scrollX={560} />
                        ) : (
                            <EmptyState icon={<IdcardOutlined />} title="No members yet" description="Invite a member from the Members page." />
                        )}
                    </AsyncSection>
                </TableSection>
            </div>
        </div>
    )
}

// ---- Member: their own Trainers ----
function MemberDashboard() {
    const navigate = useNavigate()
    const res = useAsyncData(() => api.get('/stats/member/dashboard'), [])
    const d = res.data
    const props = { loading: res.loading, error: res.error, onRetry: res.reload, errorTitle: "Couldn't load the dashboard" }

    const clientLimitHit = d?.clientLimit && d.totalClients >= d.clientLimit
    const cards = d ? [
        { icon: <IdcardOutlined />, label: 'Trainers', value: d.trainerLimit ? `${d.totalTrainers} / ${d.trainerLimit}` : d.totalTrainers, hint: d.trainerLimit && d.totalTrainers >= d.trainerLimit ? 'Limit reached' : `${d.activeTrainers} active` },
        { icon: <UsergroupAddOutlined />, label: 'Clients', value: d.clientLimit ? `${d.totalClients} / ${d.clientLimit}` : d.totalClients, hint: clientLimitHit ? 'Plan limit reached' : `${d.activeClients} active` },
        { icon: <ThunderboltOutlined />, label: 'Available Capacity', value: d.availableCapacity, hint: `${d.usedCapacity}/${d.totalCapacity} slots used` },
        { icon: <StarOutlined />, label: 'Average Rating', value: d.totalReviews ? d.averageRating.toFixed(1) : '–', hint: `${d.totalReviews} client review${d.totalReviews === 1 ? '' : 's'}`, accent: 'var(--color-warning)' },
        { icon: <EditOutlined />, label: 'Open Requests', value: d.openRequests, hint: 'Client requests awaiting a trainer', accent: d.openRequests ? 'var(--color-warning)' : undefined },
        { icon: <TeamOutlined />, label: 'Active Clients', value: d.activeClients, hint: `of ${d.totalClients} total` },
    ] : []

    const columns = [
        {
            title: 'Trainer', dataIndex: 'name',
            render: (name, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/trainers/${r.id}`)}>
                    <UserAvatar name={name || ''} color={r.avatarColor} size={34} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary">{name}</div>
                        <div className="truncate text-xs text-text-muted">{r.specialization}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Load', dataIndex: 'clients', width: 190, sorter: (a, b) => a.clients - b.clients, render: (_, r) => <CapacityBar current={r.clients} max={r.capacity} size="sm" /> },
        { title: 'Avg. progress', dataIndex: 'avgProgress', width: 150, sorter: (a, b) => a.avgProgress - b.avgProgress, render: (p) => <Progress percent={p} size="small" strokeColor="var(--color-primary)" /> },
        {
            title: 'Rating', dataIndex: 'rating', width: 190, sorter: (a, b) => a.rating - b.rating,
            render: (v, r) => (
                <div className="flex items-center gap-1.5">
                    <Rate disabled allowHalf value={v} style={{ fontSize: 12 }} />
                    <span className="text-xs text-text-muted">{r.reviewCount ? `(${r.reviewCount})` : 'no reviews'}</span>
                </div>
            ),
        },
        { title: 'Open requests', dataIndex: 'openRequests', width: 130, sorter: (a, b) => a.openRequests - b.openRequests, render: (n) => (n ? <Tag color="gold" style={{ borderRadius: 999, margin: 0 }}>{n}</Tag> : <span className="text-text-muted">0</span>) },
        { title: 'Status', dataIndex: 'status', width: 110, render: (s) => <Tag color={s === 'active' ? 'green' : 'default'} style={{ borderRadius: 999, margin: 0, textTransform: 'capitalize' }}>{s}</Tag> },
    ]

    const sub = d?.subscription
    return (
        <div>
            <PageHeader title="Dashboard" subtitle="Your trainers' workload, ratings and client growth at a glance." />

            {sub?.plan && (
                <div className="app-card mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Your subscription</div>
                        <div className="mt-0.5 text-base font-bold text-text-primary">{sub.plan} plan</div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-text-secondary">
                        <span>{sub.planExpiryDate ? `${expiryText(sub.daysLeft)} · ${fmtDate(sub.planExpiryDate)}` : 'No expiry date'}</span>
                        <SubTag status={sub.status} />
                    </div>
                </div>
            )}

            {res.error ? (
                <SectionError title="Couldn't load the dashboard" error={res.error} onRetry={res.reload} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {res.loading ? <StatCardSkeletons count={6} /> : cards.map((c, i) => <StatCard key={i} {...c} />)}
                </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Client Growth" subtitle="New clients across your trainers per month">
                    <AsyncSection {...props} rows={6}>
                        <GrowthChart data={d?.clientGrowth || []} />
                    </AsyncSection>
                </ChartCard>
                <ChartCard title="Client Distribution" subtitle="Clients per trainer">
                    <AsyncSection {...props} rows={6}>
                        <OrEmpty empty={!d?.clientDistribution?.length} text="No clients assigned to your trainers yet.">
                            <DonutChart data={d?.clientDistribution || []} centerLabel="clients" />
                        </OrEmpty>
                    </AsyncSection>
                </ChartCard>
            </div>

            <div className="mt-6">
                <TableSection title="Trainer Performance" subtitle="Workload, client progress, ratings and open requests per trainer">
                    <AsyncSection {...props} rows={5}>
                        {d?.trainers?.length ? (
                            <DataTable columns={columns} dataSource={d.trainers} pageSize={6} scrollX={860} />
                        ) : (
                            <EmptyState icon={<IdcardOutlined />} title="No trainers assigned to you yet" description="Trainers assigned to you will appear here." />
                        )}
                    </AsyncSection>
                </TableSection>
            </div>

            <div className="mt-6">
                <ChartCard title="Recent Reviews" subtitle="Latest feedback from your trainers' clients">
                    <AsyncSection {...props} rows={3}>
                        {d?.recentReviews?.length ? (
                            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                                {d.recentReviews.map((r) => (
                                    <div key={r.id} className="flex items-start gap-3 py-3">
                                        <UserAvatar name={r.clientName || ''} color={r.clientAvatarColor} size={34} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="text-sm font-semibold text-text-primary">{r.clientName} <span className="font-normal text-text-muted">→ {r.trainerName}</span></span>
                                                <Rate disabled value={r.rating} style={{ fontSize: 13 }} />
                                            </div>
                                            {r.comment && <p className="mt-1 mb-0 text-sm text-text-secondary">{r.comment}</p>}
                                            <div className="mt-1 text-xs text-text-muted">{fmtDate(r.updatedAt)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon={<StarOutlined />} title="No reviews yet" description="Client reviews of your trainers will appear here." />
                        )}
                    </AsyncSection>
                </ChartCard>
            </div>
        </div>
    )
}

export default function Dashboard() {
    const { user } = useAuth()
    // Super Admin sees the Members business; a Member sees their own Trainers.
    return user?.role === 'member' ? <MemberDashboard /> : <AdminDashboard />
}
