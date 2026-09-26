import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Select, Button, App, Modal, Form, InputNumber, DatePicker, Tag, Dropdown, Segmented } from 'antd'
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
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import { useAsyncData } from '../../../hooks/useAsyncData'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
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

// Admin's Payments page: Members or independent Trainers (switch at the top) and
// their SubscriptionPlan purchase/renewal history, backed by Member + SubscriptionPlan + MemberPayment (the same
// domain PaymentApprovals.jsx reviews self-signup submissions against — see
// memberPayments.controller.js). Renewing here creates a new, auto-approved
// MemberPayment (source: 'admin_renewal') rather than mutating history.
// Remounted per kind (key on the wrapper below), so filters, paging and modals
// start fresh when switching between Members and Trainers.
const KINDS = {
    member: {
        label: 'member',
        list: '/members',
        summary: '/members/subscription-summary',
        renew: (id) => '/member-payments/' + id + '/renew',
        history: (id) => '/member-payments?member=' + id,
        title: 'Member subscriptions, plan purchases and renewals.',
    },
    trainer: {
        label: 'trainer',
        list: '/trainers/subscriptions',
        summary: '/trainers/subscription-summary',
        renew: (id) => '/trainer-payments/' + id + '/renew',
        history: (id) => '/member-payments?trainer=' + id,
        title: 'Independent trainer subscriptions, plan purchases and renewals.',
    },
}

function SubscriptionsView({ kind }) {
    const cfg = KINDS[kind]
    const isTrainer = kind === 'trainer'
    const { message } = App.useApp()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')

    // Search + subscription-status + plan filters and paging all run on the backend
    // (see KINDS.list). `subscriptionStatus`, `purchasedAt` and `paymentCount` come back on each row.
    const list = usePagedList(cfg.list, {
        params: { subscription: statusFilter, plan: planFilter, include: 'payments' },
        search,
        pageSize: 10,
    })
    const rows = list.items
    // Headline numbers cover every member / payment, not just the visible page.
    const summaryRes = useAsyncData(() => api.get(cfg.summary), [])
    const plansRes = useAsyncData(() => api.get('/subscription-plans?audience=' + kind), [])
    const plans = plansRes.data?.items || []
    const summary = summaryRes.data || { active: 0, expiring: 0, expired: 0, totalRevenue: 0, approvedPayments: 0 }

    const [renewing, setRenewing] = useState(null) // member being renewed, or 'new'
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()
    const [historyFor, setHistoryFor] = useState(null)

    const reloadAll = () => { list.reload(); summaryRes.reload() }

    // Payment history is fetched for the one member being viewed.
    const historyRes = useAsyncData(() => api.get(cfg.history(historyFor.id)), [historyFor?.id], { enabled: !!historyFor })
    const history = historyRes.data?.items || []

    // The renew modal's member picker searches on the backend as you type.
    const [pickerSearch, setPickerSearch] = useState('')
    const [pickerQuery, setPickerQuery] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setPickerQuery(pickerSearch.trim()), 300)
        return () => clearTimeout(t)
    }, [pickerSearch])
    const pickerRes = useAsyncData(
        () => api.get(cfg.list + '?page=1&limit=20' + (pickerQuery ? '&search=' + encodeURIComponent(pickerQuery) : '')),
        [pickerQuery],
        { enabled: !!renewing },
    )
    const pickerMembers = useMemo(() => {
        const found = pickerRes.data?.items || []
        return renewing?.id && !found.some((m) => m.id === renewing.id) ? [renewing, ...found] : found
    }, [pickerRes.data, renewing])

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
            message.error('Select a ' + cfg.label + ' to renew')
            return
        }
        const v = await form.validateFields()
        setSaving(true)
        try {
            await api.post(cfg.renew(renewing.id), {
                planId: v.planId,
                amount: v.amount,
                renewalDate: v.renewalDate.toISOString(),
            })
            message.success(`${renewing.name}'s subscription was renewed`)
            setRenewing(null)
            reloadAll()
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const loadError = list.error || summaryRes.error || plansRes.error
    if (list.loading || summaryRes.loading || plansRes.loading) return <LoadingSkeleton />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load payments" error={loadError} onRetry={() => { list.reload(); summaryRes.reload(); plansRes.reload() }} /></div>

    const cards = [
        { icon: <DollarOutlined />, label: 'Revenue Collected', value: money(summary.totalRevenue), hint: `${summary.approvedPayments} approved payments` },
        { icon: <CheckCircleOutlined />, label: 'Active Subscriptions', value: summary.active, accent: 'var(--color-success)' },
        { icon: <ClockCircleOutlined />, label: 'Expiring Soon', value: summary.expiring, hint: 'Within 7 days', accent: 'var(--color-warning)' },
        { icon: <CloseCircleOutlined />, label: 'Expired', value: summary.expired, accent: 'var(--color-danger)' },
    ]

    const columns = [
        {
            title: isTrainer ? 'Trainer' : 'Member',
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
                ? <div><div className="font-medium text-text-primary">{r.plan.name}</div><div className="text-xs text-text-muted">Up to {r.plan.maxClients} clients{isTrainer ? '' : ', ' + r.plan.maxTrainers + ' trainers'}</div></div>
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
            dataIndex: 'subscriptionStatus',
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
                            { key: 'history', icon: <HistoryOutlined />, label: `Payment history (${r.paymentCount})` },
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
            <PageHeader title="Payments" subtitle={cfg.title}>
                <Button type="primary" icon={<TeamOutlined />} onClick={() => openRenew({ id: null })}>
                    Renew subscription
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c, i) => <StatCard key={i} {...c} />)}
            </div>

            <div className="mt-6">
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder={'Search ' + cfg.label + '…'} />
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

                {rows.length === 0 ? (
                    <div className="app-card">
                        <EmptyState title={'No ' + cfg.label + 's found'} description="Try adjusting your search or filters." />
                    </div>
                ) : (
                    <>
                        <DataTable columns={columns} dataSource={rows} loading={list.fetching} pagination={false} scrollX={1100} />
                        <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                    </>
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
                    <Form.Item label={isTrainer ? 'Trainer' : 'Member'} required>
                        <Select
                            showSearch
                            value={renewing?.id || undefined}
                            placeholder={'Select a ' + cfg.label}
                            filterOption={false}
                            onSearch={setPickerSearch}
                            loading={pickerRes.loading}
                            options={pickerMembers.map((m) => ({ value: m.id, label: `${m.name} (${m.email})` }))}
                            onChange={(id) => openRenew(pickerMembers.find((m) => m.id === id))}
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
                            options={activePlans.map((p) => ({ value: p.id, label: p.name + ' — ' + money(p.priceMonthly, p.currency) + '/mo (' + p.maxClients + ' clients' + (isTrainer ? '' : ', ' + p.maxTrainers + ' trainers') + ')' }))}
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
                    historyRes.loading ? (
                        <LoadingSkeleton cards={0} rows={3} />
                    ) : history.length === 0 ? (
                        <EmptyState title="No payments yet" description={'This ' + cfg.label + " hasn't made a payment."} />
                    ) : (
                        <div className="flex flex-col gap-2">
                            {history.map((p) => (
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

export default function Payments() {
    const [kind, setKind] = useState('member')
    return (
        <div>
            <Segmented
                className="mb-4"
                value={kind}
                onChange={setKind}
                options={[{ value: 'member', label: 'Members' }, { value: 'trainer', label: 'Trainers' }]}
            />
            <SubscriptionsView key={kind} kind={kind} />
        </div>
    )
}
