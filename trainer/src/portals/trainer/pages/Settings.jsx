import { useCallback, useEffect, useMemo, useState } from 'react'
import { Form, Input, Switch, Button, App, Tabs, Modal, Tag, Empty, Skeleton } from 'antd'
import { CopyOutlined, GiftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ThemePicker from '../../../components/common/ThemePicker'
import SectionError from '../../../components/feedback/SectionError'
import UserAvatar from '../../../components/common/UserAvatar'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'

function ProfileTab() {
    const { message } = App.useApp()
    const { user, trainer, refreshUser } = useAuth()
    const [saving, setSaving] = useState(false)
    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <div className="flex flex-col items-center text-center">
                    <UserAvatar name={user?.name || 'Trainer'} color={user?.avatarColor || 'var(--color-primary)'} size={84} />
                    <div className="mt-3 text-lg font-bold text-text-primary">{user?.name}</div>
                    <div className="text-sm text-text-muted">{trainer?.specialization || 'Trainer'}</div>
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
                        <Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
                        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input disabled /></Form.Item>
                        <Form.Item name="phone" label="Phone"><Input /></Form.Item>
                    </div>
                    <Button type="primary" htmlType="submit" loading={saving}>Save changes</Button>
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
    const { trainer } = useAuth()
    const [referrals, setReferrals] = useState(null)
    const [input, setInput] = useState('')
    const [refLoading, setRefLoading] = useState(true)
    const [refError, setRefError] = useState(null)

    const loadReferrals = useCallback(() => {
        setRefLoading(true)
        setRefError(null)
        api.get('/referrals/me').then(setReferrals).catch(setRefError).finally(() => setRefLoading(false))
    }, [])
    useEffect(() => { loadReferrals() }, [loadReferrals])

    const code = trainer?.referralCode || '—'

    const copyCode = async () => {
        try { await navigator.clipboard.writeText(code); message.success('Referral code copied') }
        catch { message.info(`Your code: ${code}`) }
    }

    const apply = async () => {
        try {
            await api.post('/referrals/redeem', { code: input.trim() })
            message.success('Referral code applied')
            setInput('')
            const updated = await api.get('/referrals/me')
            setReferrals(updated)
        } catch (err) { message.error(err.message) }
    }

    const myReferrals = referrals?.referred || []
    const referredBy = referrals?.referredBy || null
    const joined = myReferrals.filter((r) => r.status === 'joined').length

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="app-card p-5 lg:col-span-1">
                <h3 className="section-title mb-1">Your referral code</h3>
                <p className="mb-4 text-sm text-text-secondary">Share it with trainers you invite.</p>
                <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--color-primary-soft)' }}>
                    <span className="font-mono text-lg font-bold tracking-wider" style={{ color: 'var(--color-primary)' }}>{code}</span>
                    <Button type="text" icon={<CopyOutlined />} onClick={copyCode} aria-label="Copy referral code" />
                </div>
            </div>
            <div className="app-card p-5 lg:col-span-2">
                <h3 className="section-title mb-1">Who referred you</h3>
                {referredBy ? (
                    <div className="mt-3 flex items-center gap-3 rounded-xl p-4" style={{ background: 'var(--color-success-soft)' }}>
                        <UserAvatar name={referredBy.name} size={40} />
                        <div>
                            <div className="font-semibold text-text-primary"><CheckCircleOutlined className="mr-1" style={{ color: 'var(--color-success)' }} />{referredBy.name}</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="mb-3 text-sm text-text-secondary">Were you invited by another trainer? Enter their code.</p>
                        <div className="flex gap-2">
                            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. MARCUS-K7Q2" onPressEnter={apply} className="font-mono" style={{ maxWidth: 260 }} />
                            <Button type="primary" icon={<GiftOutlined />} onClick={apply} disabled={!input.trim()}>Apply code</Button>
                        </div>
                    </>
                )}
                <h3 className="section-title mb-1 mt-8">Trainers you referred <Tag className="ml-1" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: 'none' }}>{myReferrals.length}</Tag></h3>
                <p className="mb-3 text-sm text-text-secondary">{refLoading ? 'Loading…' : `${joined} joined · ${myReferrals.length - joined} pending`}</p>
                {refLoading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                ) : refError ? (
                    <SectionError title="Couldn't load your referrals" error={refError} onRetry={loadReferrals} />
                ) : myReferrals.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No referrals yet." />
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {myReferrals.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <UserAvatar name={r.name || 'Trainer'} size={34} />
                                    <div>
                                        <div className="font-semibold text-text-primary">{r.name || 'Trainer'}</div>
                                        <div className="text-xs text-text-muted">{r.date ? new Date(r.date).toLocaleDateString('en-CA') : ''}</div>
                                    </div>
                                </div>
                                <Tag style={{ border: 'none', background: r.status === 'joined' ? 'var(--color-success-soft)' : 'var(--color-warning-soft)', color: r.status === 'joined' ? 'var(--color-success)' : 'var(--color-warning)' }} className="capitalize">{r.status}</Tag>
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
            <Tabs items={[
                { key: 'profile', label: 'Profile', children: <ProfileTab /> },
                { key: 'referrals', label: 'Referrals', children: <ReferralsTab /> },
                { key: 'appearance', label: 'Appearance', children: <AppearanceTab /> },
                { key: 'notifications', label: 'Notifications', children: <NotificationsTab /> },
            ]} />
        </div>
    )
}
