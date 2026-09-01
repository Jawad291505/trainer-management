import {
    DashboardOutlined,
    TeamOutlined,
    IdcardOutlined,
    UsergroupAddOutlined,
    DeploymentUnitOutlined,
    ReadOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    ProfileOutlined,
    CreditCardOutlined,
    BellOutlined,
    SettingOutlined,
} from '@ant-design/icons'

// Super Admin sidebar navigation, split into labelled sections. Each group has
// a heading and a short caption describing what the items under it are for.
export const adminNavGroups = [
    {
        heading: 'Overview',
        caption: 'Platform health',
        items: [{ key: '/', label: 'Dashboard', icon: DashboardOutlined }],
    },
    {
        heading: 'People',
        caption: 'Accounts & assignments',
        items: [
            { key: '/users', label: 'Users', icon: TeamOutlined },
            { key: '/trainers', label: 'Trainers', icon: IdcardOutlined },
            { key: '/clients', label: 'Clients', icon: UsergroupAddOutlined },
            { key: '/assignments', label: 'Assignments', icon: DeploymentUnitOutlined },
        ],
    },
    {
        heading: 'Operations',
        caption: 'Content & billing',
        items: [
            { key: '/libraries', label: 'Libraries', icon: ReadOutlined },
            { key: '/foods', label: 'Foods', icon: AppleOutlined },
            { key: '/exercises', label: 'Exercises', icon: ThunderboltOutlined },
            { key: '/diet-plans', label: 'Diet Plans', icon: ProfileOutlined },
            { key: '/payments', label: 'Payments', icon: CreditCardOutlined },
        ],
    },
    {
        heading: 'Account',
        caption: 'Alerts & preferences',
        items: [
            { key: '/notifications', label: 'Notifications', icon: BellOutlined },
            { key: '/settings', label: 'Settings', icon: SettingOutlined },
        ],
    },
]

// Flat list kept for breadcrumbs and key-based lookups.
export const adminNav = adminNavGroups.flatMap((g) => g.items)
