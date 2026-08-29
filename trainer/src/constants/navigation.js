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

// Trainer sidebar navigation, split into labelled sections. Each group has a
// heading and a short caption describing what the items under it are for.
export const trainerNavGroups = [
    {
        heading: 'Overview',
        caption: 'Your day at a glance',
        items: [{ key: '/', label: 'Dashboard', icon: DashboardOutlined }],
    },
    {
        heading: 'Coaching',
        caption: 'Clients, sessions & plans',
        items: [
            { key: '/clients', label: 'My Clients', icon: TeamOutlined },
            { key: '/schedule', label: 'Schedule', icon: CalendarOutlined },
            { key: '/diet-plans', label: 'Diet Plans', icon: AppleOutlined },
            { key: '/exercise-plans', label: 'Exercise Plans', icon: ThunderboltOutlined },
            { key: '/follow-ups', label: 'Follow-ups', icon: CheckSquareOutlined },
        ],
    },
    {
        heading: 'Communication',
        caption: 'Messages & alerts',
        items: [
            { key: '/messages', label: 'Messages', icon: MessageOutlined },
            { key: '/notifications', label: 'Notifications', icon: BellOutlined },
        ],
    },
    {
        heading: 'Account',
        caption: 'Preferences & setup',
        items: [{ key: '/settings', label: 'Settings', icon: SettingOutlined }],
    },
]

// Flat list kept for breadcrumbs and key-based lookups.
export const trainerNav = trainerNavGroups.flatMap((g) => g.items)
