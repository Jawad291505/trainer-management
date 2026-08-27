import { Switch, Button, App, Tabs } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'

function AppearanceTab() {
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-1">Theme</h3>
                <p className="mb-4 text-sm text-text-secondary">Pick a color you love. It saves automatically.</p>
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
                    <div className="text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>Progress rings, highlights and charts use this color.</div>
                </div>
            </div>
        </div>
    )
}

function NotificationsTab() {
    const { message } = App.useApp()
    const rows = [
        { key: 'reminders', label: 'Daily reminders', desc: 'Nudges for meals, workouts and water' },
        { key: 'trainer', label: 'Trainer messages', desc: 'When your trainer messages you' },
        { key: 'plans', label: 'Plan updates', desc: 'New or updated diet & exercise plans' },
        { key: 'followups', label: 'Follow-up reminders', desc: 'Upcoming check-ins' },
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

function AccountTab() {
    const { message } = App.useApp()
    return (
        <div className="app-card p-5">
            <h3 className="section-title mb-4">Account</h3>
            <div className="flex flex-col gap-3">
                <Button block onClick={() => message.info('Password reset link sent')}>Change password</Button>
                <Button block onClick={() => message.info('Export requested')}>Export my data</Button>
                <Button block danger onClick={() => message.info('Contact your trainer to deactivate')}>Deactivate account</Button>
            </div>
        </div>
    )
}

export default function Settings() {
    return (
        <div>
            <PageHeader title="Settings" subtitle="Manage your preferences." />
            <Tabs
                items={[
                    { key: 'appearance', label: 'Appearance', children: <AppearanceTab /> },
                    { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
                    { key: 'account', label: 'Account', children: <AccountTab /> },
                ]}
            />
        </div>
    )
}
