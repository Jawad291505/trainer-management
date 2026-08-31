import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Dropdown, Popover, Input, AutoComplete } from 'antd'
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
import { useAuth } from '../../context/AuthContext'
import { notifications, dietPlan, exercisePlan } from '../../services/mockData'

const SEARCH_INDEX = [
    { value: 'page:/diet', label: 'My Diet Plan', sub: dietPlan.title, path: '/diet' },
    { value: 'page:/exercises', label: 'My Exercise Plan', sub: exercisePlan.title, path: '/exercises' },
    { value: 'page:/schedule', label: 'My Schedule', sub: 'Today & upcoming activities', path: '/schedule' },
    { value: 'page:/progress', label: 'My Progress', sub: 'Weight & consistency', path: '/progress' },
    { value: 'page:/messages', label: 'Messages', sub: 'Chat with your trainer', path: '/messages' },
    { value: 'page:/profile', label: 'My Profile', sub: 'Personal details & goals', path: '/profile' },
    ...dietPlan.meals.map((m) => ({ value: `meal:${m.id}`, label: m.name, sub: `Meal · ${m.time}`, path: '/diet' })),
    ...exercisePlan.days.flatMap((d) =>
        d.exercises.map((e) => ({ value: `ex:${e.id}`, label: e.name, sub: `Exercise · ${e.sets}×${e.reps}`, path: '/exercises' })),
    ),
]

export default function Header({ collapsed, onToggle, onOpenMobile }) {
    const navigate = useNavigate()
    const { logout } = useAuth()
    const [notifOpen, setNotifOpen] = useState(false)
    const [query, setQuery] = useState('')
    const unread = notifications.filter((n) => n.unread).length

    const searchOptions = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return []
        return SEARCH_INDEX.filter(
            (e) => e.label.toLowerCase().includes(q) || e.sub.toLowerCase().includes(q),
        )
            .slice(0, 8)
            .map((e) => ({
                value: e.value,
                path: e.path,
                label: (
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-text-primary">{e.label}</span>
                        <span className="text-xs text-text-muted">{e.sub}</span>
                    </div>
                ),
            }))
    }, [query])

    const onSelectResult = (_value, option) => {
        navigate(option.path)
        setQuery('')
    }

    const profileItems = [
        { key: 'profile', icon: <UserOutlined />, label: 'My profile' },
        { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
        { type: 'divider' },
        { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
    ]

    const onProfileClick = ({ key }) => {
        if (key === 'settings') navigate('/settings')
        else if (key === 'profile') navigate('/profile')
        else if (key === 'logout') {
            logout()
            navigate('/login', { replace: true })
        }
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
                <AutoComplete
                    value={query}
                    onChange={setQuery}
                    options={searchOptions}
                    onSelect={onSelectResult}
                    filterOption={false}
                    style={{ width: '100%' }}
                    allowClear
                    notFoundContent={query.trim() ? 'No matches' : null}
                >
                    <Input
                        prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
                        placeholder="Search meals, exercises…"
                        variant="filled"
                        style={{ borderRadius: 10 }}
                    />
                </AutoComplete>
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
