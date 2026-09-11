import { useState } from 'react'
import { Form, Input, Switch, Button, App, Tabs, Modal } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'
import UserAvatar from '../../../components/common/UserAvatar'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'

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
    const { user, refreshUser } = useAuth()
    const [photoOpen, setPhotoOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <UserAvatar name={user?.name || 'Admin'} color={user?.avatarColor || 'var(--color-primary)'} size={84} />
                    <div className="mt-3 text-lg font-bold text-text-primary">{user?.name || 'Admin'}</div>
                    <div className="text-sm text-text-muted">Super Admin</div>
                </div>
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <Form
                    layout="vertical"
                    initialValues={{ name: user?.name, email: user?.email, phone: user?.phone || '' }}
                    onFinish={async (v) => {
                        setSaving(true)
                        try {
                            await api.patch('/auth/me', { name: v.name, phone: v.phone })
                            await refreshUser()
                            message.success('Profile saved')
                        } catch (err) { message.error(err.message) }
                        finally { setSaving(false) }
                    }}
                >
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="name" label="Full name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                            <Input disabled />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone">
                            <Input />
                        </Form.Item>
                        <Form.Item name="role" label="Role">
                            <Input disabled defaultValue="Super Admin" value="Super Admin" />
                        </Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit" loading={saving}>
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
