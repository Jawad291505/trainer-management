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
    EditOutlined,
    ShoppingOutlined,
    CheckSquareOutlined,
    StarOutlined,
} from '@ant-design/icons'

// Client sidebar navigation, split into labelled sections. Each group has a
// heading and a short caption describing what the items under it are for.
export const clientNavGroups = [
    {
        heading: 'Overview',
        caption: 'Today at a glance',
        items: [{ key: '/', label: 'Dashboard', icon: DashboardOutlined }],
    },
    {
        heading: 'My Program',
        caption: 'Diet, training & schedule',
        items: [
            { key: '/diet', label: 'My Diet', icon: AppleOutlined },
            { key: '/grocery-list', label: 'Grocery List', icon: ShoppingOutlined },
            { key: '/exercises', label: 'My Exercises', icon: ThunderboltOutlined },
            { key: '/schedule', label: 'My Schedule', icon: CalendarOutlined },
            { key: '/follow-ups', label: 'Follow-ups', icon: CheckSquareOutlined },
            { key: '/progress', label: 'My Progress', icon: LineChartOutlined },
        ],
    },
    {
        heading: 'Communication',
        caption: 'Messages & alerts',
        items: [
            { key: '/messages', label: 'Messages', icon: MessageOutlined },
            { key: '/requests', label: 'My Requests', icon: EditOutlined, badge: 'corrections' },
            { key: '/rate-trainer', label: 'Rate Trainer', icon: StarOutlined },
            { key: '/notifications', label: 'Notifications', icon: BellOutlined },
        ],
    },
    {
        heading: 'Account',
        caption: 'Profile & preferences',
        items: [
            { key: '/profile', label: 'Profile', icon: UserOutlined },
            { key: '/settings', label: 'Settings', icon: SettingOutlined },
        ],
    },
]

// Flat list kept for breadcrumbs and key-based lookups.
export const clientNav = clientNavGroups.flatMap((g) => g.items)

// Primary items surfaced in the mobile bottom navigation bar.
export const clientBottomNav = ['/', '/diet', '/exercises', '/progress', '/messages']
