import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tabs, Progress, Timeline } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    CalendarOutlined,
    AimOutlined,
    CreditCardOutlined,
    UserOutlined,
} from '@ant-design/icons'
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import EmptyState from '../../../components/common/EmptyState'
import { clients, clientProgressSeries, clientActivity } from '../../../services/mockData'

export default function ClientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { primary } = useTheme()
    const client = clients.find((c) => c.id === id)

    const weightData = useMemo(() => clientProgressSeries, [])

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
                    <div className="flex items-center gap-3">
                        <MailOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">{client.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <AimOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">Goal: {client.goal}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CreditCardOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">{client.plan} plan</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <UserOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">Trainer: {client.trainerName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CalendarOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">Joined {client.joinDate}</span>
                    </div>
                </div>
                <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold text-text-secondary">Overall progress</span>
                        <span className="font-bold text-text-primary">{client.progress}%</span>
                    </div>
                    <Progress percent={client.progress} strokeColor="var(--color-primary)" showInfo={false} />
                </div>
            </div>

            <div className="lg:col-span-2">
                <ChartCard title="Weight Progress" subtitle="Last 8 weeks (kg)">
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={weightData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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

    const progressTab = (
        <ChartCard title="Activity Completion" subtitle="Weekly completion rate (%)">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weightData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                    <Line type="monotone" dataKey="activity" name="Completion" stroke="var(--color-success)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartCard>
    )

    const activityTab = (
        <div className="app-card p-6">
            <h3 className="section-title mb-5">Recent activity</h3>
            <Timeline
                items={clientActivity.map((a) => ({
                    color: 'var(--color-primary)',
                    children: (
                        <div>
                            <div className="font-semibold text-text-primary">{a.title}</div>
                            <div className="text-xs text-text-muted">{a.time}</div>
                        </div>
                    ),
                }))}
            />
        </div>
    )

    return (
        <div>
            <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/clients')}
                className="mb-2"
                style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}
            >
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
                        <Button icon={<MailOutlined />}>Message</Button>
                        <Button type="primary" onClick={() => navigate('/assignments')}>
                            Reassign trainer
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Progress" value={`${client.progress}%`} accent="var(--color-success)" />
                <StatCard label="Plan" value={client.plan} />
                <StatCard label="Trainer" value={client.trainerName.split(' ')[0]} hint={client.trainerName} />
                <StatCard label="Last Activity" value={client.lastActivity} />
            </div>

            <div className="mt-6">
                <Tabs
                    items={[
                        { key: 'overview', label: 'Overview', children: overview },
                        { key: 'progress', label: 'Progress', children: progressTab },
                        { key: 'activity', label: 'Activity History', children: activityTab },
                    ]}
                />
            </div>
        </div>
    )
}
