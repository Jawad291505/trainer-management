import { useState } from 'react'
import { Segmented, Button, App } from 'antd'
import {
    CreditCardOutlined,
    UserOutlined,
    WarningOutlined,
    ReadOutlined,
    CheckOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import PageSpin from '../../../components/common/PageSpin'
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import SectionError from '../../../components/feedback/SectionError'
import { api } from '../../../services/api'

const ICONS = {
    payment: CreditCardOutlined,
    user: UserOutlined,
    capacity: WarningOutlined,
    library: ReadOutlined,
}

export default function NotificationsPage() {
    const { message } = App.useApp()
    const [filter, setFilter] = useState('all')
    // The read / unread filter and paging are applied by the backend.
    const list = usePagedList('/notifications', { params: { status: filter }, pageSize: 20 })
    const { items: data, loading, error, reload: load } = list

    const markAll = async () => {
        try {
            await api.patch('/notifications/read-all')
            load()
            message.success('All marked as read')
        } catch (err) {
            message.error(err.message)
        }
    }

    if (loading) return <PageSpin />
    if (error) return <div className="app-card"><SectionError title="Couldn't load notifications" error={error} onRetry={load} /></div>

    return (
        <div>
            <PageHeader title="Notifications" subtitle="Stay on top of platform activity.">
                <Button icon={<CheckOutlined />} onClick={markAll}>
                    Mark all read
                </Button>
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

            {data.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="You're all caught up" description="No notifications in this view." />
                </div>
            ) : (
                <div className="app-card divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {data.map((n) => {
                        const Icon = ICONS[n.type] || UserOutlined
                        return (
                            <div
                                key={n.id}
                                className="flex items-start gap-4 p-4 transition-colors"
                                style={{ background: n.unread ? 'var(--color-surface-secondary)' : 'transparent' }}
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

            <Pager list={list} pageSizeOptions={[20, 50, 100]} />
        </div>
    )
}
