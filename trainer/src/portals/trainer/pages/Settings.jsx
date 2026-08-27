import { Form, Input, Switch, Button, App, Tabs } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'
import UserAvatar from '../../../components/common/UserAvatar'
import { currentTrainer } from '../../../services/mockData'

function ProfileTab() {
    const { message } = App.useApp()
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <UserAvatar name={currentTrainer.name} color={currentTrainer.avatarColor} size={84} />
                    <div className="mt-3 text-lg font-bold text-text-primary">{currentTrainer.name}</div>
                    <div className="text-sm text-text-muted">{currentTrainer.specialization}</div>
                    <Button className="mt-4" block>Change photo</Button>
                </div>
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <Form
                    layout="vertical"
                    initialValues={{
                        name: currentTrainer.name,
                        email: currentTrainer.email,
                        specialization: currentTrainer.specialization,
                        phone: '+1 (555) 019-4471',
                    }}
                    onFinish={() => message.success('Profile saved')}
                >
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
                        <Form.Item name="specialization" label="Specialization"><Input /></Form.Item>
                        <Form.Item name="phone" label="Phone"><Input /></Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit">Save changes</Button>
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
                <p className="mb-4 text-sm text-text-secondary">Choose an accent color for your studio. Saved automatically.</p>
                <ThemePicker />
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <h3 className="section-title mb-3">Live preview</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="primary">Primary button</Button>
                    <Button>Secondary</Button>
                    <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>Active tag</span>
                    <Switch defaultChecked />
                </div>
                <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--color-primary)' }}>
                    <div className="font-bold" style={{ color: 'var(--color-on-primary, #fff)' }}>Accent surface</div>
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Navigation, highlights and charts use this color.</div>
                </div>
            </div>
        </div>
    )
}

function NotificationsTab() {
    const { message } = App.useApp()
    const rows = [
        { key: 'messages', label: 'Client messages', desc: 'New messages from your clients' },
        { key: 'followups', label: 'Follow-up reminders', desc: 'Due and overdue check-ins' },
        { key: 'sessions', label: 'Session reminders', desc: 'Upcoming sessions on your schedule' },
        { key: 'progress', label: 'Progress alerts', desc: 'When clients hit or miss goals' },
    ]
    return (
        <div className="app-card p-5">
            {rows.map((r, i) => (
                <div key={r.key} className={`flex items-center justify-between py-4 ${i > 0 ? 'border-t' : ''}`} style={{ borderColor: 'var(--color-border)' }}>
                    <div>
                        <div className="font-semibold text-text-primary">{r.label}</div>
                        <div className="text-sm text-text-muted">{r.desc}</div>
                    </div>
                    <Switch defaultChecked onChange={() => message.success('Preference updated')} />
                </div>
            ))}
        </div>
    )
}

export default function Settings() {
    return (
        <div>
            <PageHeader title="Settings" subtitle="Manage your account and preferences." />
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
