import {
    DashboardOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    CalendarOutlined,
    LineChartOutlined,
    MessageOutlined,
    BellOutlined,
    UserOutlined,
    SettingOutlined,
} from '@ant-design/icons'

// Client sidebar / bottom-nav navigation.
export const clientNav = [
    { key: '/', label: 'Dashboard', icon: DashboardOutlined },
    { key: '/diet', label: 'My Diet', icon: AppleOutlined },
    { key: '/exercises', label: 'My Exercises', icon: ThunderboltOutlined },
    { key: '/schedule', label: 'My Schedule', icon: CalendarOutlined },
    { key: '/progress', label: 'My Progress', icon: LineChartOutlined },
    { key: '/messages', label: 'Messages', icon: MessageOutlined },
    { key: '/notifications', label: 'Notifications', icon: BellOutlined },
    { key: '/profile', label: 'Profile', icon: UserOutlined },
    { key: '/settings', label: 'Settings', icon: SettingOutlined },
]

// Primary items surfaced in the mobile bottom navigation bar.
export const clientBottomNav = ['/', '/diet', '/exercises', '/progress', '/messages']
