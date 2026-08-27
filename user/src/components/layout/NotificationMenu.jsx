import { useNavigate } from 'react-router-dom'
import {
    ThunderboltOutlined,
    MessageOutlined,
    CheckSquareOutlined,
    AppleOutlined,
    RiseOutlined,
} from '@ant-design/icons'
import { notifications } from '../../services/mockData'

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
    const unread = notifications.filter((n) => n.unread).length

    return (
        <div
            className="w-80 overflow-hidden rounded-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-sm font-bold text-text-primary">Notifications</span>
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {unread} new
                </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
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
