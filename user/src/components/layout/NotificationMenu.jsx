import { useNavigate } from 'react-router-dom'
import {
    ThunderboltOutlined,
    MessageOutlined,
    CheckSquareOutlined,
    AppleOutlined,
    RiseOutlined,
} from '@ant-design/icons'
import { Skeleton } from 'antd'
import { api } from '../../services/api'
import { useAsyncData } from '../../hooks/useAsyncData'
import SectionError from '../feedback/SectionError'

const ICONS = {
    plan: ThunderboltOutlined,
    message: MessageOutlined,
    followup: CheckSquareOutlined,
    diet: AppleOutlined,
    progress: RiseOutlined,
}

// Content for the header notification dropdown.
export default function NotificationMenu({ onClose }) {
    const navigate = useNavigate()
    // The dropdown only previews 5 — ask for 5, and use the server's real unread
    // total. Briefly cached so re-opening the bell doesn't refetch.
    const { data, loading, error, reload } = useAsyncData(() => api.get('/notifications?limit=5', { ttl: 15_000 }), [])
    const notifications = data?.items || []
    const unread = data?.unreadCount ?? notifications.filter((n) => n.unread).length

    return (
        <div
            className="w-80 overflow-hidden rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-sm font-bold text-text-primary">Notifications</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {loading ? '…' : unread} new
                </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {loading && <div className="px-4 py-3"><Skeleton active avatar paragraph={{ rows: 2 }} /></div>}
                {error && <SectionError title="Couldn't load notifications" onRetry={reload} className="m-3" />}
                {!loading && !error && notifications.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-text-muted">You're all caught up</div>
                )}
                {notifications.slice(0, 5).map((n) => {
                    const Icon = ICONS[n.type] || MessageOutlined
                    return (
                        <div
                            key={n.id}
                            className="flex cursor-pointer gap-3 px-4 py-3 transition-colors"
                            style={{ background: n.unread ? 'var(--color-surface-secondary)' : 'transparent' }}
                            onClick={() => {
                                navigate('/notifications')
                                onClose?.()
                            }}
                        >
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                <Icon style={{ fontSize: 15 }} />
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-text-primary">{n.title}</div>
                                <div className="text-xs text-text-secondary">{n.desc}</div>
                                <div className="mt-0.5 text-[11px] text-text-muted">{n.time}</div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <button
                className="w-full border-t py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-surface-secondary"
                style={{ borderColor: 'var(--color-border)' }}
                onClick={() => {
                    navigate('/notifications')
                    onClose?.()
                }}
            >
                View all notifications
            </button>
        </div>
    )
}
