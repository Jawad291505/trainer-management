import { Form, Input, Switch, Button, App, Tabs } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'
import UserAvatar from '../../../components/common/UserAvatar'

function ProfileTab() {
    const { message } = App.useApp()
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <UserAvatar name="Alexandra Reed" color="var(--color-primary)" size={84} />
                    <div className="mt-3 text-lg font-bold text-text-primary">Alexandra Reed</div>
                    <div className="text-sm text-text-muted">Super Admin</div>
                    <Button className="mt-4" block>
                        Change photo
                    </Button>
                </div>
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <Form
                    layout="vertical"
                    initialValues={{ name: 'Alexandra Reed', email: 'alex.reed@fittrack.io', phone: '+1 (555) 018-2245' }}
                    onFinish={() => message.success('Profile saved')}
                >
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone">
                            <Input />
                        </Form.Item>
                        <Form.Item name="role" label="Role">
                            <Input disabled defaultValue="Super Admin" value="Super Admin" />
                        </Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit">
                        Save changes
                    </Button>
                </Form>
            </div>
        </div>
    )
}

function AppearanceTab() {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-1">Theme</h3>
                <p className="mb-4 text-sm text-text-secondary">
                    Choose an accent color. It applies across the entire platform and is saved automatically.
                </p>
                <ThemePicker />
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <h3 className="section-title mb-3">Live preview</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="primary">Primary button</Button>
                    <Button>Secondary</Button>
                    <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        Active tag
                    </span>
                    <Switch defaultChecked />
                </div>
                <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--color-primary)' }}>
                    <div className="font-bold" style={{ color: 'var(--color-on-primary, #fff)' }}>
                        Accent surface
                    </div>
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        Navigation, highlights and charts use this color.
                    </div>
                </div>
            </div>
        </div>
    )
}

function NotificationsTab() {
    const { message } = App.useApp()
    const rows = [
        { key: 'payments', label: 'Payment alerts', desc: 'New payments, failures and refunds' },
        { key: 'trainers', label: 'Trainer activity', desc: 'Applications and capacity warnings' },
        { key: 'clients', label: 'Client updates', desc: 'New sign-ups and status changes' },
        { key: 'digest', label: 'Weekly digest', desc: 'Summary email every Monday' },
    ]
    return (
        <div className="app-card p-5">
            {rows.map((r, i) => (
                <div key={r.key} className={`flex items-center justify-between py-4 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                        <div className="font-semibold text-text-primary">{r.label}</div>
                        <div className="text-sm text-text-muted">{r.desc}</div>
                    </div>
                    <Switch defaultChecked={r.key !== 'digest'} onChange={() => message.success('Preference updated')} />
                </div>
            ))}
        </div>
    )
}

export default function Settings() {
    return (
        <div>
            <PageHeader title="Settings" subtitle="Manage your account and platform preferences." />
            <Tabs
                items={[
                    { key: 'profile', label: 'Profile', children: <ProfileTab /> },
                    { key: 'appearance', label: 'Appearance', children: <AppearanceTab /> },
                    { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
                ]}
            />
        </div>
    )
}
