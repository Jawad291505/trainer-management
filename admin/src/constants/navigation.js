import {
    DashboardOutlined,
    TeamOutlined,
    IdcardOutlined,
    UsergroupAddOutlined,
    DeploymentUnitOutlined,
    ReadOutlined,
    CreditCardOutlined,
    BellOutlined,
    SettingOutlined,
} from '@ant-design/icons'

// Super Admin sidebar navigation. Role-specific by design so other
// portals can define their own without a giant shared menu.
export const adminNav = [
    { key: '/', label: 'Dashboard', icon: DashboardOutlined },
    { key: '/users', label: 'Users', icon: TeamOutlined },
    { key: '/trainers', label: 'Trainers', icon: IdcardOutlined },
    { key: '/clients', label: 'Clients', icon: UsergroupAddOutlined },
    { key: '/assignments', label: 'Assignments', icon: DeploymentUnitOutlined },
    { key: '/libraries', label: 'Libraries', icon: ReadOutlined },
    { key: '/payments', label: 'Payments', icon: CreditCardOutlined },
    { key: '/notifications', label: 'Notifications', icon: BellOutlined },
    { key: '/settings', label: 'Settings', icon: SettingOutlined },
]
