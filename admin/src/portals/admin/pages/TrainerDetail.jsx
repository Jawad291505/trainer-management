import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Rate, Tabs, Progress, Modal, Input, App } from 'antd'
import {
    ArrowLeftOutlined,
    MailOutlined,
    CalendarOutlined,
    DollarOutlined,
    StarOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import CapacityBar from '../../../components/common/CapacityBar'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import ChartCard from '../../../components/common/ChartCard'
import RevenueChart from '../../../components/charts/RevenueChart'
import { trainers, clients, revenueTrend } from '../../../services/mockData'

const money = (v) => `$${v.toLocaleString()}`

export default function TrainerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { message } = App.useApp()
    const trainer = trainers.find((t) => t.id === id)
    const [msgOpen, setMsgOpen] = useState(false)
    const [msgText, setMsgText] = useState('')

    const assigned = useMemo(() => clients.filter((c) => c.trainerId === id), [id])

    const sendMessage = () => {
        if (!msgText.trim()) {
            message.warning('Write a message first')
            return
        }
        message.success(`Message sent to ${trainer.name}`)
        setMsgText('')
        setMsgOpen(false)
    }

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
            title: 'Client',
            dataIndex: 'name',
            render: (_, r) => (
                <div className="flex items-center gap-3">
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
        {
            title: 'Progress',
            dataIndex: 'progress',
            width: 160,
            render: (p) => <Progress percent={p} size="small" strokeColor="var(--color-primary)" />,
        },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
    ]

    const overview = (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-4">Profile</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3">
                        <MailOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">{trainer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <StarOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">{trainer.specialization}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <CalendarOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">Joined {trainer.joinDate}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <DollarOutlined style={{ color: 'var(--color-text-muted)' }} />
                        <span className="text-text-secondary">{money(trainer.revenue)} lifetime revenue</span>
                    </div>
                </div>
                <div className="mt-5">
                    <div className="mb-2 text-sm font-semibold text-text-secondary">Client capacity</div>
                    <CapacityBar current={trainer.clients} max={trainer.capacity} />
                </div>
            </div>

            <div className="lg:col-span-2">
                <ChartCard title="Revenue" subtitle="Monthly performance">
                    <RevenueChart data={revenueTrend} height={260} />
                </ChartCard>
            </div>
        </div>
    )

    const clientsTab =
        assigned.length === 0 ? (
            <div className="app-card">
                <EmptyState title="No clients assigned" description="Assign clients from the Assignments page." />
            </div>
        ) : (
            <DataTable columns={clientColumns} dataSource={assigned} pageSize={8} scrollX={720} />
        )

    return (
        <div>
            <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/trainers')}
                className="mb-2"
                style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}
            >
                Back to trainers
            </Button>

            {/* Hero */}
            <div className="app-card mb-6 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <UserAvatar name={trainer.name} color={trainer.avatarColor} size={64} />
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="m-0 text-xl font-extrabold text-text-primary md:text-2xl">{trainer.name}</h1>
                                <StatusBadge status={trainer.status} />
                            </div>
                            <div className="mt-1 text-sm text-text-muted">{trainer.specialization}</div>
                            <div className="mt-1.5 flex items-center gap-1">
                                <Rate disabled allowHalf value={trainer.rating} style={{ fontSize: 13 }} />
                                <span className="text-xs font-semibold text-text-secondary">{trainer.rating}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button icon={<MailOutlined />} onClick={() => setMsgOpen(true)}>Message</Button>
                        <Button type="primary" onClick={() => navigate('/assignments')}>
                            Manage clients
                        </Button>
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
                <Tabs
                    items={[
                        { key: 'overview', label: 'Overview', children: overview },
                        { key: 'clients', label: `Clients (${assigned.length})`, children: clientsTab },
                    ]}
                />
            </div>

            <Modal
                title={`Message ${trainer.name}`}
                open={msgOpen}
                onCancel={() => setMsgOpen(false)}
                onOk={sendMessage}
                okText="Send message"
                centered
            >
                <Input.TextArea
                    className="mt-2"
                    rows={4}
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    placeholder={`Write a message to ${trainer.name}…`}
                />
            </Modal>
        </div>
    )
}
