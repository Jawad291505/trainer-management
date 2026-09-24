import { Button, Input, App } from 'antd'
import dayjs from 'dayjs'
import { CopyOutlined, LinkOutlined } from '@ant-design/icons'
import ChartCard from '../../../components/common/ChartCard'
import StatusBadge from '../../../components/common/StatusBadge'
import AsyncSection from '../../../components/feedback/AsyncSection'
import { useAsyncData } from '../../../hooks/useAsyncData'
import { api } from '../../../services/api'

const STATUS_LABEL = { pending: 'Pending', reimbursed: 'Reimbursed', rejected: 'Rejected' }

// Member view: my referral code + shareable signup link, and who signed up with it.
export default function MyReferrals() {
    const { message } = App.useApp()
    const { data, loading, error, reload } = useAsyncData(() => api.get('/member-referrals/me'), [])
    const code = data?.code
    const link = code ? `${window.location.origin}/signup?ref=${encodeURIComponent(code)}` : ''

    const copy = async (text, what) => {
        try {
            await navigator.clipboard.writeText(text)
            message.success(`${what} copied`)
        } catch {
            message.error('Could not copy — select and copy it manually')
        }
    }

    return (
        <AsyncSection loading={loading} error={error} onRetry={reload} errorTitle="Couldn't load your referrals" rows={4}>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Your referral code" subtitle="Share it, or send the link — it fills in automatically at signup">
                    <div className="space-y-3">
                        <Input readOnly size="large" value={code} className="font-mono" addonAfter={<CopyOutlined onClick={() => copy(code, 'Code')} className="cursor-pointer" />} />
                        <Input readOnly size="large" value={link} prefix={<LinkOutlined />} addonAfter={<CopyOutlined onClick={() => copy(link, 'Link')} className="cursor-pointer" />} />
                        <Button type="primary" icon={<CopyOutlined />} onClick={() => copy(link, 'Link')}>Copy invite link</Button>
                        {data?.referredBy && (
                            <p className="text-xs text-text-muted">You joined via {data.referredBy.name} on {dayjs(data.referredBy.date).format('YYYY-MM-DD')}.</p>
                        )}
                    </div>
                </ChartCard>

                <ChartCard title="Members you referred" subtitle="Reimbursement is handled by the admin">
                    {data?.referred?.length ? (
                        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                            {data.referred.map((r) => (
                                <div key={r.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <div className="text-sm font-semibold text-text-primary">{r.name}</div>
                                        <div className="text-xs text-text-muted">{dayjs(r.date).format('YYYY-MM-DD')}</div>
                                    </div>
                                    <StatusBadge status={r.status === 'reimbursed' ? 'paid' : r.status === 'rejected' ? 'failed' : 'pending'} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-text-muted">No one has signed up with your code yet.</p>
                    )}
                </ChartCard>
            </div>
        </AsyncSection>
    )
}
