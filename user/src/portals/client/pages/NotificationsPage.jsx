import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Segmented, Button, App } from 'antd'
import {
    ThunderboltOutlined,
    MessageOutlined,
    CheckSquareOutlined,
    AppleOutlined,
    RiseOutlined,
    CheckOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import PageSpin from '../../../components/common/PageSpin'
import { api } from '../../../services/api'

const ICONS = {
    plan: ThunderboltOutlined,
    message: MessageOutlined,
    followup: CheckSquareOutlined,
    diet: AppleOutlined,
    progress: RiseOutlined,
}

// Where a notification's `ref.kind` should take the client when clicked.
const ROUTES = { followup: '/follow-ups', conversation: '/messages', correction: '/requests' }

export default function NotificationsPage() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState([])
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/notifications').then((res) => setData(res.items || [])).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const filtered = data.filter((n) => (filter === 'all' ? true : filter === 'unread' ? n.unread : !n.unread))

    const markAll = async () => {
        try {
            await api.patch('/notifications/read-all')
            setData((prev) => prev.map((n) => ({ ...n, unread: false })))
            message.success('All marked as read')
        } catch (err) {
            message.error(err.message || 'Could not mark notifications as read')
        }
    }

    // Open the thing a notification is about, and mark it read on the way.
    const open = (n) => {
        if (n.unread) {
            setData((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
            api.patch(`/notifications/${n.id}/read`).catch(() => { })
        }
        const target = ROUTES[n.ref?.kind]
        if (target) navigate(target)
    }

    if (loading) return <PageSpin />

    return (
        <div>
            <PageHeader title="Notifications" subtitle="Updates from your trainer and plans.">
                <Button icon={<CheckOutlined />} onClick={markAll}>Mark all read</Button>
            </PageHeader>

            <div className="mb-4">
                <Segmented
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { value: 'all', label: 'All' },
                        { value: 'unread', label: 'Unread' },
                        { value: 'read', label: 'Read' },
                    ]}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="You're all caught up" description="No notifications in this view." />
                </div>
            ) : (
                <div className="app-card divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {filtered.map((n) => {
                        const Icon = ICONS[n.type] || MessageOutlined
                        return (
                            <div
                                key={n.id}
                                className="flex cursor-pointer items-start gap-4 p-4"
                                style={{ background: n.unread ? 'var(--color-surface-secondary)' : 'transparent' }}
                                onClick={() => open(n)}
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                    <Icon />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-text-primary">{n.title}</span>
                                        {n.unread && <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-primary)' }} />}
                                    </div>
                                    <div className="text-sm text-text-secondary">{n.desc}</div>
                                    <div className="mt-0.5 text-xs text-text-muted">{n.time}</div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
