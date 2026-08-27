import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Dropdown, Popover, Input } from 'antd'
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    BellOutlined,
    SearchOutlined,
    BgColorsOutlined,
    UserOutlined,
    SettingOutlined,
    LogoutOutlined,
} from '@ant-design/icons'
import UserAvatar from '../common/UserAvatar'
import NotificationMenu from './NotificationMenu'
import ThemePicker from '../common/ThemePicker'
import { notifications } from '../../services/mockData'

export default function Header({ collapsed, onToggle, onOpenMobile }) {
    const navigate = useNavigate()
    const [notifOpen, setNotifOpen] = useState(false)
    const unread = notifications.filter((n) => n.unread).length

    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'My profile' },
        { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ]

    const onProfileClick = ({ key }) => {
        if (key === 'settings') navigate('/settings')
        else if (key === 'profile') navigate('/profile')
    }

    return (
        <header
            className="sticky top-0 z-20 flex h-16 items-center gap-3 px-4 md:px-6"
            style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
        >
            {/* Desktop collapse / mobile drawer trigger */}
            <button
                onClick={() => (window.innerWidth < 1024 ? onOpenMobile() : onToggle())}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary"
                aria-label="Toggle navigation"
            >
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>

            <div className="hidden max-w-md flex-1 md:block">
                <Input
                    prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
                    placeholder="Search meals, exercises…"
                    variant="filled"
                    style={{ borderRadius: 10 }}
                />
            </div>

            <div className="ml-auto flex items-center gap-1 md:gap-2">
                <Popover
                    content={<ThemePicker compact />}
                    trigger="click"
                    placement="bottomRight"
                    title={null}
                >
                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary"
                        aria-label="Theme color"
                    >
                        <BgColorsOutlined style={{ fontSize: 17 }} />
                    </button>
                </Popover>

                <Popover
                    content={<NotificationMenu onClose={() => setNotifOpen(false)} />}
                    trigger="click"
                    open={notifOpen}
                    onOpenChange={setNotifOpen}
                    placement="bottomRight"
                    styles={{ body: { padding: 0, background: 'transparent', boxShadow: 'none' } }}
                >
                    <button
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary"
                        aria-label="Notifications"
                    >
                        <Badge count={unread} size="small" offset={[-2, 2]}>
                            <BellOutlined style={{ fontSize: 17 }} />
                        </Badge>
                    </button>
                </Popover>

                <Dropdown
                    menu={{ items: profileItems, onClick: onProfileClick }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <button className="ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-secondary">
                        <UserAvatar name="Emma Thompson" color="var(--color-primary)" size={34} />
                        <div className="hidden text-left leading-tight lg:block">
                            <div className="text-sm font-bold text-text-primary">Emma Thompson</div>
                            <div className="text-[11px] text-text-muted">Client</div>
                        </div>
                    </button>
                </Dropdown>
            </div>
        </header>
    )
}
