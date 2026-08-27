import { useState } from 'react'
import { Segmented, Button, App } from 'antd'
import {
    MessageOutlined,
    CheckSquareOutlined,
    RiseOutlined,
    CalendarOutlined,
    CheckOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import { notifications as seed } from '../../../services/mockData'

const ICONS = {
    message: MessageOutlined,
    followup: CheckSquareOutlined,
    progress: RiseOutlined,
    session: CalendarOutlined,
}

export default function NotificationsPage() {
    const { message } = App.useApp()
    const [data, setData] = useState(seed)
    const [filter, setFilter] = useState('all')

    const filtered = data.filter((n) => (filter === 'all' ? true : filter === 'unread' ? n.unread : !n.unread))

    const markAll = () => {
        setData((prev) => prev.map((n) => ({ ...n, unread: false })))
        message.success('All marked as read')
    }

    return (
        <div>
            <PageHeader title="Notifications" subtitle="Stay updated on your clients and sessions.">
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
                            <div key={n.id} className="flex items-start gap-4 p-4" style={{ background: n.unread ? 'var(--color-surface-secondary)' : 'transparent' }}>
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
