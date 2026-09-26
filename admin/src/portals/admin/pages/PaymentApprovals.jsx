import { useState } from 'react'
import { Select, Button, App, Modal, Input, Image, Tag } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

const STATUS_TAG = { pending: 'gold', approved: 'green', rejected: 'red' }
const PAYER_LABEL = { member: 'Member', trainer: 'Trainer' }
const SOURCE_LABEL = { self_signup: 'Self-signup', admin_renewal: 'Admin renewal' }

// Admin-only review queue for Member and Trainer self-signup payment proofs
// (memberPayments.controller.js). Approving flips the account active and
// applies the plan's client limit; rejecting keeps them pending and lets them
// resubmit from their own Pending Approval screen.
export default function PaymentApprovals() {
    const { message } = App.useApp()
    const [status, setStatus] = useState('pending')
    const [payer, setPayer] = useState('all')
    const [search, setSearch] = useState('')
    const list = usePagedList('/member-payments', { params: { status, payer }, search, pageSize: 10 })
    const { items: data, total, loading, error: loadError, reload: fetchPayments } = list
    const [viewing, setViewing] = useState(null)
    const [rejecting, setRejecting] = useState(null)
    const [reason, setReason] = useState('')
    const [acting, setActing] = useState(false)

    const approve = async (payment) => {
        setActing(true)
        try {
            await api.patch(`/member-payments/${payment.id}/approve`, {})
            fetchPayments()
            message.success(`${payment.payerName} approved — their account is now active`)
            setViewing(null)
        } catch (err) {
            message.error(err.message)
        } finally {
            setActing(false)
        }
    }

    const reject = async () => {
        setActing(true)
        try {
            await api.patch(`/member-payments/${rejecting.id}/reject`, { reason })
            fetchPayments()
            message.success(`${rejecting.payerName}'s payment was rejected`)
            setRejecting(null)
            setReason('')
            setViewing(null)
        } catch (err) {
            message.error(err.message)
        } finally {
            setActing(false)
        }
    }

    const columns = [
        {
            title: 'Payer',
            dataIndex: 'payerName',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={r.payerName} color={r.payerAvatarColor} size={36} />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="truncate font-semibold text-text-primary">{r.payerName}</span>
                            <Tag color={r.payerType === 'trainer' ? 'purple' : 'blue'} style={{ borderRadius: 999, margin: 0 }}>{PAYER_LABEL[r.payerType]}</Tag>
                        </div>
                        <div className="truncate text-xs text-text-muted">{r.payerEmail}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Plan', dataIndex: 'planName', width: 130 },
        { title: 'Amount', dataIndex: 'amount', width: 130, render: (a, r) => money(a, r.currency) },
        { title: 'Submitted', dataIndex: 'submittedAt', width: 170, render: fmtDate },
        {
            title: 'Source',
            dataIndex: 'source',
            width: 130,
            render: (s) => <Tag color={s === 'admin_renewal' ? 'blue' : 'default'} style={{ borderRadius: 999 }}>{SOURCE_LABEL[s] || s}</Tag>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (s) => <Tag color={STATUS_TAG[s]} style={{ borderRadius: 999 }}>{s}</Tag>,
        },
        {
            title: '',
            key: 'actions',
            width: 200,
            fixed: 'right',
            render: (_, r) => (
                <div className="flex justify-end gap-2">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => setViewing(r)}>Review</Button>
                    {r.status === 'pending' && (
                        <>
                            <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => approve(r)} />
                            <Button size="small" danger icon={<CloseOutlined />} onClick={() => { setRejecting(r); setReason('') }} />
                        </>
                    )}
                </div>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Payment Approvals" subtitle={loading ? 'Loading…' : `${total} submissions`} />

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" />
                <Select
                    value={payer}
                    onChange={setPayer}
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'Members & Trainers' },
                        { value: 'member', label: 'Members' },
                        { value: 'trainer', label: 'Trainers' },
                    ]}
                />
                <Select
                    value={status}
                    onChange={setStatus}
                    style={{ width: 160 }}
                    options={[
                        { value: 'pending', label: 'Pending review' },
                        { value: 'approved', label: 'Approved' },
                        { value: 'rejected', label: 'Rejected' },
                        { value: 'all', label: 'All' },
                    ]}
                />
            </FilterBar>

            {loading ? (
                <LoadingSkeleton cards={0} rows={6} />
            ) : loadError ? (
                <div className="app-card"><SectionError title="Couldn't load payments" error={loadError} onRetry={fetchPayments} /></div>
            ) : data.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="Nothing here" description="No payment submissions match this filter." />
                </div>
            ) : (
                <>
                    <DataTable columns={columns} dataSource={data} loading={list.fetching} pagination={false} scrollX={1030} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </>
            )}

            <Modal
                title="Payment review"
                open={!!viewing}
                onCancel={() => setViewing(null)}
                footer={viewing?.status === 'pending' ? [
                    <Button key="reject" danger onClick={() => { setRejecting(viewing); setReason('') }}>Reject</Button>,
                    <Button key="approve" type="primary" loading={acting} onClick={() => approve(viewing)}>Approve</Button>,
                ] : null}
                centered
                width={480}
            >
                {viewing && (
                    <div>
                        <div className="mb-4 flex items-center gap-3">
                            <UserAvatar name={viewing.payerName} color={viewing.payerAvatarColor} size={44} />
                            <div>
                                <div className="font-bold text-text-primary">{viewing.payerName} <Tag color={viewing.payerType === 'trainer' ? 'purple' : 'blue'} style={{ borderRadius: 999 }}>{PAYER_LABEL[viewing.payerType]}</Tag></div>
                                <div className="text-xs text-text-muted">{viewing.payerEmail}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="text-text-muted">Plan</div>
                            <div className="text-right font-semibold">{viewing.planName} ({viewing.maxClients} clients)</div>
                            <div className="text-text-muted">Amount</div>
                            <div className="text-right font-semibold">{money(viewing.amount, viewing.currency)}</div>
                            <div className="text-text-muted">Submitted</div>
                            <div className="text-right font-semibold">{fmtDate(viewing.submittedAt)}</div>
                            {viewing.rejectionReason && (
                                <>
                                    <div className="text-text-muted">Rejection reason</div>
                                    <div className="text-right font-semibold text-danger">{viewing.rejectionReason}</div>
                                </>
                            )}
                        </div>
                        <div className="mt-4">
                            {viewing.screenshotUrl ? (
                                <Image src={viewing.screenshotUrl} alt="Payment proof" style={{ width: '100%', borderRadius: 8 }} />
                            ) : (
                                <div className="rounded-lg p-3 text-center text-sm text-text-muted" style={{ background: 'var(--color-surface-secondary)' }}>
                                    Recorded manually by an admin — no payment screenshot attached.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                title="Reject payment"
                open={!!rejecting}
                onCancel={() => setRejecting(null)}
                onOk={reject}
                okText="Reject payment"
                okButtonProps={{ danger: true, loading: acting }}
                centered
            >
                <p className="text-sm text-text-secondary">Let {rejecting?.payerName} know why (optional) — they&apos;ll see this and can resubmit.</p>
                <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Screenshot doesn't show the transaction amount" />
            </Modal>
        </div>
    )
}
