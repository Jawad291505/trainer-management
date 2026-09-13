import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Select, Button, App, Modal, Form, InputNumber, DatePicker, Tag, Dropdown } from 'antd'
import {
    DollarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    MoreOutlined,
    HistoryOutlined,
    SyncOutlined,
    TeamOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'

const money = (n, currency = 'PKR') => `${currency} ${Number(n || 0).toLocaleString()}`
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-CA') : '—')

const SUB_STATUS = {
    active: { label: 'Active', color: 'green' },
    expiring: { label: 'Expiring soon', color: 'gold' },
    expired: { label: 'Expired', color: 'red' },
    inactive: { label: 'Inactive', color: 'default' },
    no_plan: { label: 'No plan', color: 'default' },
}

// Derive a display subscription status from the member's own status + plan +
// expiry — there's no separate "subscription status" field, it's computed.
function subscriptionStatus(member) {
    if (!member.plan) return 'no_plan'
    if (member.status !== 'active') return 'inactive'
    if (!member.planExpiryDate) return 'active'
    const daysLeft = dayjs(member.planExpiryDate).diff(dayjs(), 'day')
    if (daysLeft < 0) return 'expired'
    if (daysLeft <= 7) return 'expiring'
    return 'active'
}

// Admin's Payments page: Members and their SubscriptionPlan purchase/renewal
// history, backed by Member + SubscriptionPlan + MemberPayment (the same
// domain PaymentApprovals.jsx reviews self-signup submissions against — see
// memberPayments.controller.js). Renewing here creates a new, auto-approved
// MemberPayment (source: 'admin_renewal') rather than mutating history.
export default function Payments() {
    const { message } = App.useApp()
    const [loading, setLoading] = useState(true)
    const [members, setMembers] = useState([])
    const [payments, setPayments] = useState([])
    const [plans, setPlans] = useState([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')

    const [renewing, setRenewing] = useState(null) // member being renewed, or 'new'
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()
    const [historyFor, setHistoryFor] = useState(null)

    const load = async () => {
        setLoading(true)
        try {
            const [m, p, pl] = await Promise.all([
                api.get('/members'),
                api.get('/member-payments'),
                api.get('/subscription-plans'),
            ])
            setMembers(m.items || [])
            setPayments(p.items || [])
            setPlans(pl.items || [])
        } catch (err) {
            message.error('Failed to load payments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [])

    const paymentsByMember = useMemo(() => {
        const map = {}
        for (const p of payments) {
            if (!map[p.memberId]) map[p.memberId] = []
            map[p.memberId].push(p)
        }
        return map
    }, [payments])

    const rows = useMemo(() => members.map((m) => {
        const history = paymentsByMember[m.id] || []
        const lastApproved = history.find((p) => p.status === 'approved')
        return {
            ...m,
            purchasedAt: lastApproved?.submittedAt || m.joinDate,
            subStatus: subscriptionStatus(m),
            historyCount: history.length,
        }
    }), [members, paymentsByMember])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter((r) => {
            const matchQ = !q || r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q)
            const matchS = statusFilter === 'all' || r.subStatus === statusFilter
            const matchP = planFilter === 'all' || r.plan?.id === planFilter
            return matchQ && matchS && matchP
        })
    }, [rows, search, statusFilter, planFilter])

    const summary = useMemo(() => ({
        active: rows.filter((r) => r.subStatus === 'active').length,
        expiringSoon: rows.filter((r) => r.subStatus === 'expiring').length,
        expired: rows.filter((r) => r.subStatus === 'expired').length,
        totalRevenue: payments.filter((p) => p.status === 'approved').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    }), [rows, payments])

    const activePlans = useMemo(() => plans.filter((p) => p.active), [plans])

    const openRenew = (member) => {
        setRenewing(member)
        const defaultPlan = member.plan || activePlans[0] || null
        form.setFieldsValue({
            planId: defaultPlan?.id,
            amount: defaultPlan?.priceMonthly,
            renewalDate: dayjs(),
        })
    }

    const onPlanChange = (planId) => {
        const plan = plans.find((p) => p.id === planId)
        if (plan) form.setFieldsValue({ amount: plan.priceMonthly })
    }

    const submitRenewal = async () => {
        if (!renewing?.id) {
            message.error('Select a member to renew')
            return
        }
        const v = await form.validateFields()
        setSaving(true)
        try {
            await api.post(`/member-payments/${renewing.id}/renew`, {
                planId: v.planId,
                amount: v.amount,
                renewalDate: v.renewalDate.toISOString(),
            })
            message.success(`${renewing.name}'s subscription was renewed`)
            setRenewing(null)
            await load()
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <LoadingSkeleton />

    const cards = [
        { icon: <DollarOutlined />, label: 'Revenue Collected', value: money(summary.totalRevenue), hint: `${payments.filter((p) => p.status === 'approved').length} approved payments` },
        { icon: <CheckCircleOutlined />, label: 'Active Subscriptions', value: summary.active, accent: 'var(--color-success)' },
        { icon: <ClockCircleOutlined />, label: 'Expiring Soon', value: summary.expiringSoon, hint: 'Within 7 days', accent: 'var(--color-warning)' },
        { icon: <CloseCircleOutlined />, label: 'Expired', value: summary.expired, accent: 'var(--color-danger)' },
    ]

    const columns = [
        {
            title: 'Member',
            dataIndex: 'name',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={r.name} color={r.avatarColor} size={36} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary">{r.name}</div>
                        <div className="truncate text-xs text-text-muted">{r.email}</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Plan',
            dataIndex: ['plan', 'name'],
            width: 170,
            render: (_, r) => r.plan
                ? <div><div className="font-medium text-text-primary">{r.plan.name}</div><div className="text-xs text-text-muted">Up to {r.plan.maxClients} clients, {r.plan.maxTrainers} trainers</div></div>
                : <span className="text-text-muted">—</span>,
        },
        {
            title: 'Price',
            width: 130,
            render: (_, r) => r.plan ? <span className="font-semibold text-text-primary">{money(r.plan.priceMonthly, r.plan.currency)}<span className="text-xs font-normal text-text-muted">/mo</span></span> : '—',
        },
        { title: 'Purchased', dataIndex: 'purchasedAt', width: 130, render: fmtDate },
        {
            title: 'Status',
            dataIndex: 'subStatus',
            width: 130,
            render: (s) => <Tag color={SUB_STATUS[s].color} style={{ borderRadius: 999 }}>{SUB_STATUS[s].label}</Tag>,
        },
        { title: 'Expiry', dataIndex: 'planExpiryDate', width: 120, render: fmtDate },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, r) => (
                <Dropdown
                    trigger={['click']}
                    menu={{
                        items: [
                            { key: 'renew', icon: <SyncOutlined />, label: 'Renew subscription' },
                            { key: 'history', icon: <HistoryOutlined />, label: `Payment history (${r.historyCount})` },
                        ],
                        onClick: ({ key }) => (key === 'renew' ? openRenew(r) : setHistoryFor(r)),
                    }}
                >
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Payments" subtitle="Member subscriptions, plan purchases and renewals.">
                <Button type="primary" icon={<TeamOutlined />} onClick={() => openRenew({ id: null })} disabled={!members.length}>
                    Renew subscription
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            <div className="mt-6">
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search member…" />
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 160 }}
                        options={[{ value: 'all', label: 'All status' }, ...Object.entries(SUB_STATUS).map(([v, s]) => ({ value: v, label: s.label }))]}
                    />
                    <Select
                        value={planFilter}
                        onChange={setPlanFilter}
                        style={{ width: 200 }}
                        options={[{ value: 'all', label: 'All plans' }, ...plans.map((p) => ({ value: p.id, label: p.name }))]}
                    />
                </FilterBar>

                {filtered.length === 0 ? (
                    <div className="app-card">
                        <EmptyState title="No members found" description="Try adjusting your search or filters." />
                    </div>
                ) : (
                    <DataTable columns={columns} dataSource={filtered} pageSize={9} scrollX={1100} />
                )}
            </div>

            <Modal
                title="Renew subscription"
                open={!!renewing}
                onCancel={() => setRenewing(null)}
                onOk={submitRenewal}
                okText="Confirm renewal"
                confirmLoading={saving}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item label="Member" required>
                        <Select
                            showSearch
                            value={renewing?.id || undefined}
                            placeholder="Select a member"
                            optionFilterProp="label"
                            options={members.map((m) => ({ value: m.id, label: `${m.name} (${m.email})` }))}
                            onChange={(id) => openRenew(members.find((m) => m.id === id))}
                        />
                    </Form.Item>

                    {renewing?.id && (
                        <div className="mb-4 rounded-lg p-3 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                            <span className="text-text-muted">Current plan: </span>
                            <span className="font-semibold text-text-primary">
                                {renewing.plan ? `${renewing.plan.name} (${money(renewing.plan.priceMonthly, renewing.plan.currency)}/mo)` : 'No plan yet'}
                            </span>
                        </div>
                    )}

                    <Form.Item name="planId" label="Renewal plan" rules={[{ required: true, message: 'Select a plan' }]}>
                        <Select
                            placeholder="Select a plan"
                            options={activePlans.map((p) => ({ value: p.id, label: `${p.name} — ${money(p.priceMonthly, p.currency)}/mo (${p.maxClients} clients, ${p.maxTrainers} trainers)` }))}
                            onChange={onPlanChange}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                        <Form.Item name="amount" label="Renewal amount" rules={[{ required: true, message: 'Enter the amount received' }]}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="renewalDate" label="Renewal date" rules={[{ required: true, message: 'Pick the renewal date' }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={historyFor ? `${historyFor.name} — payment history` : 'Payment history'}
                open={!!historyFor}
                onCancel={() => setHistoryFor(null)}
                footer={[<Button key="close" onClick={() => setHistoryFor(null)}>Close</Button>]}
                centered
            >
                {historyFor && (
                    (paymentsByMember[historyFor.id] || []).length === 0 ? (
                        <EmptyState title="No payments yet" description="This member hasn't made a payment." />
                    ) : (
                        <div className="flex flex-col gap-2">
                            {(paymentsByMember[historyFor.id] || []).map((p) => (
                                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3 text-sm" style={{ borderColor: 'var(--color-border)' }}>
                                    <div>
                                        <div className="font-semibold text-text-primary">{p.planName}</div>
                                        <div className="text-xs text-text-muted">
                                            {fmtDate(p.submittedAt)} · {p.source === 'admin_renewal' ? 'Admin renewal' : 'Self-signup'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-text-primary">{money(p.amount, p.currency)}</div>
                                        <Tag color={p.status === 'approved' ? 'green' : p.status === 'rejected' ? 'red' : 'gold'} style={{ borderRadius: 999 }}>{p.status}</Tag>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </Modal>
        </div>
    )
}
