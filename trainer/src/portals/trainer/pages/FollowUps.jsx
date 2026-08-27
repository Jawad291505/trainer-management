import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented, Button, App } from 'antd'
import {
    PlusOutlined,
    CheckOutlined,
    MessageOutlined,
    CalendarOutlined,
    WarningFilled,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import EmptyState from '../../../components/common/EmptyState'
import UserAvatar from '../../../components/common/UserAvatar'
import { followUps as seed } from '../../../services/mockData'

const BUCKETS = [
    { key: 'today', label: 'Due Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
]

export default function FollowUps() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seed)
    const [active, setActive] = useState('today')

    const counts = BUCKETS.reduce((acc, b) => {
        acc[b.key] = data.filter((f) => f.bucket === b.key).length
        return acc
    }, {})

    const list = data.filter((f) => f.bucket === active)

    const complete = (id) => {
        setData((prev) => prev.map((f) => (f.id === id ? { ...f, bucket: 'completed' } : f)))
        message.success('Follow-up completed')
    }

    return (
        <div>
            <PageHeader title="Follow-ups" subtitle="Stay on top of client check-ins.">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('Open new follow-up form')}>
                    New follow-up
                </Button>
            </PageHeader>

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Due Today" value={counts.today} accent="var(--color-info)" />
                <StatCard label="Upcoming" value={counts.upcoming} />
                <StatCard label="Overdue" value={counts.overdue} accent="var(--color-danger)" />
                <StatCard label="Completed" value={counts.completed} accent="var(--color-success)" />
            </div>

            <div className="mb-4 overflow-x-auto">
                <Segmented
                    value={active}
                    onChange={setActive}
                    options={BUCKETS.map((b) => ({ value: b.key, label: `${b.label} (${counts[b.key]})` }))}
                />
            </div>

            {list.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="Nothing here" description="No follow-ups in this bucket." />
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {list.map((f) => {
                        const overdue = f.bucket === 'overdue'
                        const done = f.bucket === 'completed'
                        return (
                            <div
                                key={f.id}
                                className="app-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                                style={overdue ? { borderLeft: '3px solid var(--color-danger)' } : undefined}
                            >
                                <button className="flex flex-1 items-center gap-3 text-left" onClick={() => navigate(`/clients/${f.clientId}`)}>
                                    <UserAvatar name={f.clientName} color={f.avatarColor} size={42} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-semibold text-text-primary transition-colors hover:text-primary">{f.clientName}</span>
                                            {overdue && <WarningFilled style={{ color: 'var(--color-danger)', fontSize: 12 }} />}
                                        </div>
                                        <div className="text-xs text-text-muted">{f.goal} · {f.note}</div>
                                    </div>
                                </button>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1.5 text-xs" style={{ color: overdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                                        <CalendarOutlined /> {f.date}
                                    </span>
                                    <Button size="small" icon={<MessageOutlined />} onClick={() => navigate('/messages')} />
                                    {!done && (
                                        <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => complete(f.id)}>
                                            Complete
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
