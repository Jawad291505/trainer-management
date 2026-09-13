import { useEffect, useMemo, useState } from 'react'
import { Select, Button, App, Modal, Input, Image, Tag } from 'antd'
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import { api } from '../../../services/api'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`
const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—')

const STATUS_TAG = { pending: 'gold', approved: 'green', rejected: 'red' }
const SOURCE_LABEL = { self_signup: 'Self-signup', admin_renewal: 'Admin renewal' }

// Admin-only review queue for Member self-signup payment proofs
// (memberPayments.controller.js). Approving flips the Member active and
// applies the plan's client limit; rejecting keeps them pending and lets them
// resubmit from their own Pending Approval screen.
export default function PaymentApprovals() {
    const { message } = App.useApp()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState('pending')
    const [search, setSearch] = useState('')
    const [viewing, setViewing] = useState(null)
    const [rejecting, setRejecting] = useState(null)
    const [reason, setReason] = useState('')
    const [acting, setActing] = useState(false)

    const fetchPayments = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/member-payments${status !== 'all' ? `?status=${status}` : ''}`)
            setData(res.items || [])
        } catch (err) {
            message.error('Failed to load payments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPayments() }, [status])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return data
        return data.filter((p) => p.memberName?.toLowerCase().includes(q) || p.memberEmail?.toLowerCase().includes(q))
    }, [data, search])

    const approve = async (payment) => {
        setActing(true)
        try {
            await api.patch(`/member-payments/${payment.id}/approve`, {})
            setData((prev) => prev.map((p) => (p.id === payment.id ? { ...p, status: 'approved' } : p)))
            message.success(`${payment.memberName} approved — their account is now active`)
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
            setData((prev) => prev.map((p) => (p.id === rejecting.id ? { ...p, status: 'rejected' } : p)))
            message.success(`${rejecting.memberName}'s payment was rejected`)
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
            title: 'Member',
            dataIndex: 'memberName',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={r.memberName} color={r.memberAvatarColor} size={36} />
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary">{r.memberName}</div>
                        <div className="truncate text-xs text-text-muted">{r.memberEmail}</div>
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

    if (loading) return <LoadingSkeleton />

    return (
        <div>
            <PageHeader title="Payment Approvals" subtitle={`${filtered.length} submissions`} />

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search by member…" />
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

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="Nothing here" description="No payment submissions match this filter." />
                </div>
            ) : (
                <DataTable columns={columns} dataSource={filtered} pageSize={9} scrollX={1030} />
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
                            <UserAvatar name={viewing.memberName} color={viewing.memberAvatarColor} size={44} />
                            <div>
                                <div className="font-bold text-text-primary">{viewing.memberName}</div>
                                <div className="text-xs text-text-muted">{viewing.memberEmail}</div>
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
                <p className="text-sm text-text-secondary">Let {rejecting?.memberName} know why (optional) — they&apos;ll see this and can resubmit.</p>
                <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Screenshot doesn't show the transaction amount" />
            </Modal>
        </div>
    )
}
