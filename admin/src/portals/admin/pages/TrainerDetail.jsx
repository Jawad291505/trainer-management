import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Rate, Tabs, Progress, Modal, Input, App, Tag } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    CalendarOutlined,
    DollarOutlined,
    StarOutlined,
} from '@ant-design/icons'
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import CapacityBar from '../../../components/common/CapacityBar'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import ChartCard from '../../../components/common/ChartCard'
import RevenueChart from '../../../components/charts/RevenueChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { api } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'

const money = (v) => `${(v || 0).toLocaleString()}`
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '—'

export default function TrainerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { message } = App.useApp()
    const { user } = useAuth()
    const [trainer, setTrainer] = useState(null)
    const [assigned, setAssigned] = useState([])
    const [revTrend, setRevTrend] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const [t, c] = await Promise.all([
                    api.get(`/trainers/${id}`),
                    api.get(`/clients?trainer=${id}`),
                ])
                setTrainer(t)
                setAssigned(c.items || [])
                // Revenue trend is Payments/Sales data — Admin only.
                if (user?.role === 'admin') {
                    api.get('/stats/admin/revenue-trend').then((r) => setRevTrend(r.items || [])).catch(() => {})
                }
            } catch {
                // trainer not found
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id, user?.role])

    if (loading) return <LoadingSkeleton />

    if (!trainer) {
        return (
            <div className="app-card">
                <EmptyState
                    title="Trainer not found"
                    description="This trainer may have been removed."
                    action={<Button type="primary" onClick={() => navigate('/trainers')}>Back to trainers</Button>}
                />
            </div>
        )
    }

    const available = Math.max(0, trainer.capacity - trainer.clients)

    const clientColumns = [
        {
            title: 'Client', dataIndex: 'name',
            render: (_, r) => (
                <div className="flex cursor-pointer items-center gap-3" onClick={() => navigate(`/clients/${r.id}`)}>
                    <UserAvatar name={r.name} color={r.avatarColor} size={34} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary">{r.name}</div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Goal', dataIndex: 'goal', width: 140, render: (g) => <span className="text-text-secondary">{g}</span> },
        { title: 'Plan', dataIndex: 'plan', width: 110 },
        { title: 'Progress', dataIndex: 'progress', width: 160, render: (p) => <Progress percent={p || 0} size="small" strokeColor="var(--color-primary)" /> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
    ]

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/trainers')} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>Back to trainers</Button>

            <div className="app-card mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={trainer.name} color={trainer.avatarColor} size={64} />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="m-0 text-xl font-extrabold text-text-primary md:text-2xl">{trainer.name}</h1>
                                <StatusBadge status={trainer.status} />
                                {user?.role === 'admin' && (
                                    <Tag color={trainer.trainerType === 'third-party' ? 'purple' : 'default'} style={{ borderRadius: 999, margin: 0 }}>
                                        {trainer.trainerType === 'third-party' ? `Third-party${trainer.memberName ? ` — ${trainer.memberName}` : ''}` : 'In-house'}
                                    </Tag>
                                )}
                            </div>
                            <div className="mt-1 text-sm text-text-muted">{trainer.specialization}</div>
                            <div className="mt-1.5 flex items-center gap-1">
                                <Rate disabled allowHalf value={trainer.rating} style={{ fontSize: 13 }} />
                                <span className="text-xs font-semibold text-text-secondary">{trainer.rating}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button type="primary" onClick={() => navigate('/assignments')}>Manage clients</Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Assigned Clients" value={trainer.clients} hint={`of ${trainer.capacity} capacity`} />
                <StatCard label="Available Slots" value={available} />
                <StatCard label="Rating" value={trainer.rating} hint="Avg. client score" />
                <StatCard label="Revenue" value={money(trainer.revenue)} hint="Lifetime" />
            </div>

            <div className="mt-6">
                <Tabs items={[
                    {
                        key: 'overview', label: 'Overview', children: (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <div className="app-card p-5 lg:col-span-1">
                                    <h3 className="section-title mb-4">Profile</h3>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-3"><MailOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{trainer.email}</span></div>
                                        <div className="flex items-center gap-3"><StarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{trainer.specialization}</span></div>
                                        <div className="flex items-center gap-3"><CalendarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Joined {fmtDate(trainer.joinDate)}</span></div>
                                        <div className="flex items-center gap-3"><DollarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{money(trainer.revenue)} lifetime revenue</span></div>
                                    </div>
                                    <div className="mt-5">
                                        <div className="mb-2 text-sm font-semibold text-text-secondary">Client capacity</div>
                                        <CapacityBar current={trainer.clients} max={trainer.capacity} />
                                    </div>
                                </div>
                                <div className="lg:col-span-2"><ChartCard title="Revenue" subtitle="Monthly performance"><RevenueChart data={revTrend} height={260} /></ChartCard></div>
                            </div>
                        )
                    },
                    {
                        key: 'clients', label: `Clients (${assigned.length})`, children: assigned.length === 0 ? (
                            <div className="app-card"><EmptyState title="No clients assigned" description="Assign clients from the Assignments page." /></div>
                        ) : <DataTable columns={clientColumns} dataSource={assigned} pageSize={8} scrollX={720} />
                    },
                ]} />
            </div>
        </div>
    )
}
