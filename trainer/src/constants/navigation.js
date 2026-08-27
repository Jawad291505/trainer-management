import {
    DashboardOutlined,
    TeamOutlined,
    CalendarOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    CheckSquareOutlined,
    MessageOutlined,
    BellOutlined,
    SettingOutlined,
} from '@ant-design/icons'

// Trainer sidebar navigation.
export const trainerNav = [
    { key: '/', label: 'Dashboard', icon: DashboardOutlined },
    { key: '/clients', label: 'My Clients', icon: TeamOutlined },
    { key: '/schedule', label: 'Schedule', icon: CalendarOutlined },
    { key: '/diet-plans', label: 'Diet Plans', icon: AppleOutlined },
    { key: '/exercise-plans', label: 'Exercise Plans', icon: ThunderboltOutlined },
    { key: '/follow-ups', label: 'Follow-ups', icon: CheckSquareOutlined },
    { key: '/messages', label: 'Messages', icon: MessageOutlined },
    { key: '/notifications', label: 'Notifications', icon: BellOutlined },
    { key: '/settings', label: 'Settings', icon: SettingOutlined },
]
