import { useMemo, useState } from 'react'
import { Form, Input, Switch, Button, App, Tabs, Modal, Tag, Empty } from 'antd'
import { CopyOutlined, GiftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'
import UserAvatar from '../../../components/common/UserAvatar'
import { currentTrainer } from '../../../services/mockData'
import { getMyCode, getReferredBy, redeemCode, getMyReferrals } from '../../../services/referrals'

function ChangePhotoModal({ open, onClose }) {
    const { message } = App.useApp()
    const [url, setUrl] = useState('')
    return (
        <Modal
            title="Change photo"
            open={open}
            onCancel={onClose}
            onOk={() => {
                message.success('Photo updated')
                setUrl('')
                onClose()
            }}
            okText="Update photo"
            centered
        >
            <p className="mb-2 text-sm text-text-secondary">Paste an image URL to use as your profile photo.</p>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/photo.jpg" />
        </Modal>
    )
}

function ProfileTab() {
    const { message } = App.useApp()
    const [photoOpen, setPhotoOpen] = useState(false)
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <UserAvatar name={currentTrainer.name} color={currentTrainer.avatarColor} size={84} />
                    <div className="mt-3 text-lg font-bold text-text-primary">{currentTrainer.name}</div>
                    <div className="text-sm text-text-muted">{currentTrainer.specialization}</div>
                    <Button className="mt-4" block onClick={() => setPhotoOpen(true)}>Change photo</Button>
                </div>
                <ChangePhotoModal open={photoOpen} onClose={() => setPhotoOpen(false)} />
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

function ReferralsTab() {
    const { message } = App.useApp()
    const code = useMemo(() => getMyCode(), [])
    const [referredBy, setReferredBy] = useState(() => getReferredBy())
    const [referrals] = useState(() => getMyReferrals())
    const [input, setInput] = useState('')

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(code)
            message.success('Referral code copied')
        } catch {
            message.info(`Your code: ${code}`)
        }
    }

    const apply = () => {
        const res = redeemCode(input)
        if (!res.ok) {
            message.error(res.error)
            return
        }
        setReferredBy(res.referrer)
        setInput('')
        message.success(`You were referred by ${res.referrer.name}`)
    }

    const joined = referrals.filter((r) => r.status === 'joined').length

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-1">Your referral code</h3>
                <p className="mb-4 text-sm text-text-secondary">
                    Auto-generated once and tied to your account. Share it with trainers you invite —
                    they enter it when they join.
                </p>
                <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--color-primary-soft)' }}
                >
                    <span className="font-mono text-lg font-bold tracking-wider" style={{ color: 'var(--color-primary)' }}>
                        {code}
                    </span>
                    <Button type="text" icon={<CopyOutlined />} onClick={copyCode} aria-label="Copy referral code" />
                </div>
                <div className="mt-4 text-xs text-text-muted">
                    This code cannot be changed or regenerated.
                </div>
            </div>

            <div className="app-card p-5 lg:col-span-2">
                <h3 className="section-title mb-1">Who referred you</h3>
                {referredBy ? (
                    <div className="mt-3 flex items-center gap-3 rounded-xl p-4" style={{ background: 'var(--color-success-soft)' }}>
                        <UserAvatar name={referredBy.name} size={40} />
                        <div>
                            <div className="font-semibold text-text-primary">
                                <CheckCircleOutlined className="mr-1" style={{ color: 'var(--color-success)' }} />
                                {referredBy.name}
                            </div>
                            <div className="text-sm text-text-muted">
                                Code {referredBy.code} · redeemed {referredBy.date}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="mb-3 text-sm text-text-secondary">
                            Were you invited by another trainer? Enter their referral code once to link your accounts.
                        </p>
                        <div className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g. MARCUS-K7Q2"
                                onPressEnter={apply}
                                className="font-mono"
                                style={{ maxWidth: 260 }}
                            />
                            <Button type="primary" icon={<GiftOutlined />} onClick={apply} disabled={!input.trim()}>
                                Apply code
                            </Button>
                        </div>
                    </>
                )}

                <h3 className="section-title mb-1 mt-8">
                    Trainers you referred{' '}
                    <Tag className="ml-1" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: 'none' }}>
                        {referrals.length}
                    </Tag>
                </h3>
                <p className="mb-3 text-sm text-text-secondary">
                    {joined} joined · {referrals.length - joined} pending
                </p>
                {referrals.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No referrals yet — share your code to get started." />
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {referrals.map((r) => (
                            <div key={r.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={r.referee?.name || 'Trainer'} size={34} />
                                    <div>
                                        <div className="font-semibold text-text-primary">{r.referee?.name || 'Trainer'}</div>
                                        <div className="text-xs text-text-muted">Joined with {r.code} · {r.date}</div>
                                    </div>
                                </div>
                                <Tag
                                    style={{
                                        border: 'none',
                                        background: r.status === 'joined' ? 'var(--color-success-soft)' : 'var(--color-warning-soft)',
                                        color: r.status === 'joined' ? 'var(--color-success)' : 'var(--color-warning)',
                                    }}
                                    className="capitalize"
                                >
                                    {r.status}
                                </Tag>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                    { key: 'referrals', label: 'Referrals', children: <ReferralsTab /> },
                    { key: 'appearance', label: 'Appearance', children: <AppearanceTab /> },
                    { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
                ]}
            />
        </div>
    )
}
