import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Tabs, Progress, App } from 'antd'
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
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { api } from '../../../services/api'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-CA') : '—'

export default function ClientDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { message } = App.useApp()
    const { primary } = useTheme()
    const [client, setClient] = useState(null)
    const [weightData, setWeightData] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const c = await api.get(`/clients/${id}`)
                setClient(c)
                try {
                    const w = await api.get(`/progress/weight?client=${id}`)
                    setWeightData((w.items || []).map((e, i) => ({ week: e.label || `W${i + 1}`, weight: e.weightKg })))
                } catch { /* no weight data */ }
            } catch { /* client not found */ }
            finally { setLoading(false) }
        }
        load()
    }, [id])

    if (loading) return <LoadingSkeleton />

    if (!client) {
        return (
            <div className="app-card">
                <EmptyState title="Client not found" description="This client may have been removed." action={<Button type="primary" onClick={() => navigate('/clients')}>Back to clients</Button>} />
            </div>
        )
    }

    const overview = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-4">Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3"><MailOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.email}</span></div>
                    <div className="flex items-center gap-3"><AimOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Goal: {client.goal}</span></div>
                    <div className="flex items-center gap-3"><CreditCardOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">{client.plan} plan</span></div>
                    <div className="flex items-center gap-3"><UserOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Trainer: {client.trainerName || '—'}</span></div>
                    <div className="flex items-center gap-3"><CalendarOutlined style={{ color: 'var(--color-text-muted)' }} /><span className="text-text-secondary">Joined {fmtDate(client.joinDate)}</span></div>
                </div>
                {(client.weight || client.target) && (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div><div className="text-base font-extrabold text-text-primary">{client.weight ? `${client.weight}kg` : '—'}</div><div className="text-[11px] text-text-muted">Current</div></div>
                        <div><div className="text-base font-extrabold text-text-primary">{client.startWeight ? `${client.startWeight}kg` : '—'}</div><div className="text-[11px] text-text-muted">Start</div></div>
                        <div><div className="text-base font-extrabold text-text-primary">{client.target ? `${client.target}kg` : '—'}</div><div className="text-[11px] text-text-muted">Target</div></div>
                    </div>
                )}
                <div className="mt-5">
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-semibold text-text-secondary">Overall progress</span>
                        <span className="font-bold text-text-primary">{client.progress || 0}%</span>
                    </div>
                    <Progress percent={client.progress || 0} strokeColor="var(--color-primary)" showInfo={false} />
                </div>
            </div>
            <div className="lg:col-span-2">
                <ChartCard title="Weight Progress" subtitle={`${weightData.length} weigh-ins (kg)`}>
                    {weightData.length === 0 ? (
                        <div className="flex h-[260px] items-center justify-center text-sm text-text-muted">No weight entries yet</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={weightData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                                <Tooltip content={<ChartTooltip />} />
                                <Line type="monotone" dataKey="weight" name="Weight" stroke={primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </ChartCard>
            </div>
        </div>
    )

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/clients')} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>Back to clients</Button>
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
                    <Button type="primary" onClick={() => navigate('/assignments')}>Reassign trainer</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Progress" value={`${client.progress || 0}%`} accent="var(--color-success)" />
                <StatCard label="Current Weight" value={client.weight ? `${client.weight}kg` : '—'} hint={client.target ? `Target ${client.target}kg` : ''} />
                <StatCard label="Plan" value={client.plan} />
                <StatCard label="Trainer" value={client.trainerName || '—'} />
            </div>
            <div className="mt-6">
                <Tabs items={[{ key: 'overview', label: 'Overview', children: overview }]} />
            </div>
        </div>
    )
}
