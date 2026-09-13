import {
    DashboardOutlined,
    TeamOutlined,
    IdcardOutlined,
    UsergroupAddOutlined,
    DeploymentUnitOutlined,
    ShareAltOutlined,
    ReadOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    ProfileOutlined,
    CreditCardOutlined,
    BellOutlined,
    SettingOutlined,
    CrownOutlined,
    FileDoneOutlined,
    SolutionOutlined,
} from '@ant-design/icons'

// Super Admin sidebar navigation, split into labelled sections. Each group has
// a heading and a short caption describing what the items under it are for.
// "Members" is the drill-down hierarchy view (Member -> their Trainers ->
// their Clients); "Trainers" is the flat, platform-wide list — both in-house
// (Admin's own) and third-party (Member-associated) — with a type filter/badge.
// A Member sees the same shape but scoped to their own Trainers/Clients, no
// Member management, and no Payments (see getAdminNavGroups below).
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
            { key: '/members', label: 'Members', icon: IdcardOutlined },
            { key: '/trainers', label: 'Trainers', icon: SolutionOutlined },
            { key: '/clients', label: 'Clients', icon: UsergroupAddOutlined },
            { key: '/assignments', label: 'Assignments', icon: DeploymentUnitOutlined },
            { key: '/referrals', label: 'Referrals', icon: ShareAltOutlined },
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
            { key: '/subscription-plans', label: 'Subscription Plans', icon: CrownOutlined },
            { key: '/payment-approvals', label: 'Payment Approvals', icon: FileDoneOutlined },
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

// Member sidebar navigation — same Admin portal, minus member management
// (a Member doesn't manage other Members) and minus Payments/Sales entirely.
// "Trainers" here is the member's own scoped trainer list (backend-filtered).
export const memberNavGroups = [
    {
        heading: 'Overview',
        caption: 'Your scope at a glance',
        items: [{ key: '/', label: 'Dashboard', icon: DashboardOutlined }],
    },
    {
        heading: 'People',
        caption: 'Your trainers & clients',
        items: [
            { key: '/users', label: 'Users', icon: TeamOutlined },
            { key: '/trainers', label: 'Trainers', icon: IdcardOutlined },
            { key: '/clients', label: 'Clients', icon: UsergroupAddOutlined },
            { key: '/assignments', label: 'Assignments', icon: DeploymentUnitOutlined },
            { key: '/referrals', label: 'Referrals', icon: ShareAltOutlined },
        ],
    },
    {
        heading: 'Operations',
        caption: 'Content (no billing)',
        items: [
            { key: '/libraries', label: 'Libraries', icon: ReadOutlined },
            { key: '/foods', label: 'Foods', icon: AppleOutlined },
            { key: '/exercises', label: 'Exercises', icon: ThunderboltOutlined },
            { key: '/diet-plans', label: 'Diet Plans', icon: ProfileOutlined },
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

// Pick the right nav for the logged-in role — same Admin portal, dynamic content.
export function getNavGroups(role) {
    return role === 'member' ? memberNavGroups : adminNavGroups
}

// Flat lists kept for breadcrumbs and key-based lookups.
export const adminNav = adminNavGroups.flatMap((g) => g.items)
export const memberNav = memberNavGroups.flatMap((g) => g.items)
