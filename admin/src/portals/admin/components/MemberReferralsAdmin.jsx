import { useState } from 'react'
import { Select, Skeleton, App } from 'antd'
import dayjs from 'dayjs'
import { ShareAltOutlined, ClockCircleOutlined, DollarOutlined, CloseCircleOutlined } from '@ant-design/icons'
import StatCard from '../../../components/common/StatCard'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import UserAvatar from '../../../components/common/UserAvatar'
import AsyncSection from '../../../components/feedback/AsyncSection'
import SectionError from '../../../components/feedback/SectionError'
import { usePagedList } from '../../../hooks/usePagedList'
import { api } from '../../../services/api'

export const REIMBURSEMENT_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'reimbursed', label: 'Reimbursed' },
    { value: 'rejected', label: 'Rejected' },
]

const person = (name, email) => (
    <div className="flex items-center gap-3">
        <UserAvatar name={name} size={34} />
        <div>
            <div className="font-semibold text-text-primary">{name}</div>
            <div className="text-xs text-text-muted">{email}</div>
        </div>
    </div>
)

// Admin: who referred whom (members), and the reimbursement status of each referrer.
export default function MemberReferralsAdmin() {
    const { message } = App.useApp()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const list = usePagedList('/member-referrals/overview', { params: { status }, search, pageSize: 10 })
    const stats = list.data?.stats

    const cards = !stats ? [] : [
        { icon: <ShareAltOutlined />, label: 'Member Referrals', value: stats.total },
        { icon: <ClockCircleOutlined />, label: 'Awaiting Reimbursement', value: stats.pending, accent: 'var(--color-warning)' },
        { icon: <DollarOutlined />, label: 'Reimbursed', value: stats.reimbursed, accent: 'var(--color-success)' },
        { icon: <CloseCircleOutlined />, label: 'Rejected', value: stats.rejected, accent: 'var(--color-danger)' },
    ]

    const changeStatus = async (row, next) => {
        const prev = row.status
        list.setItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: next } : r)))
        try {
            await api.patch(`/member-referrals/${row.id}`, { status: next })
            message.success(`Marked ${next}`)
            list.reload() // refresh the headline counts
        } catch (err) {
            list.setItems((rows) => rows.map((r) => (r.id === row.id ? { ...r, status: prev } : r)))
            message.error(err.message || 'Could not update status')
        }
    }

    const columns = [
        { title: 'Referrer (to reimburse)', dataIndex: 'referrerName', render: (n, r) => person(n, r.referrerEmail) },
        { title: 'Referred member', dataIndex: 'refereeName', render: (n, r) => person(n, r.refereeEmail) },
        { title: 'Code used', dataIndex: 'code', width: 150, render: (c) => <span className="font-mono text-xs text-text-secondary">{c}</span> },
        { title: 'Signed up', dataIndex: 'date', width: 120, render: (d) => <span className="text-text-secondary">{dayjs(d).format('YYYY-MM-DD')}</span> },
        {
            title: 'Their account',
            dataIndex: 'refereeAccount',
            width: 120,
            render: (s) => <span className="text-xs text-text-secondary">{s === 'active' ? 'Active' : 'Not yet approved'}</span>,
        },
        {
            title: 'Reimbursement',
            dataIndex: 'status',
            width: 160,
            render: (s, r) => (
                <Select
                    size="small"
                    value={s}
                    onChange={(v) => changeStatus(r, v)}
                    options={REIMBURSEMENT_OPTIONS}
                    style={{ width: 130 }}
                />
            ),
        },
    ]

    return (
        <div>
            {list.error ? (
                <SectionError title="Couldn't load member referrals" error={list.error} onRetry={list.reload} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {list.loading
                        ? Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 1 }} title={{ width: '50%' }} /></div>
                        ))
                        : cards.map((c, i) => <StatCard key={i} {...c} />)}
                </div>
            )}

            <div className="mt-6">
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search member or code…" />
                    <Select
                        value={status}
                        onChange={setStatus}
                        style={{ width: 170 }}
                        options={[{ value: 'all', label: 'All statuses' }, ...REIMBURSEMENT_OPTIONS]}
                    />
                </FilterBar>
                <AsyncSection loading={list.loading} error={list.error} onRetry={list.reload} errorTitle="Couldn't load member referrals" rows={6}>
                    <DataTable columns={columns} dataSource={list.items} loading={list.fetching} pagination={false} scrollX={900} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </AsyncSection>
            </div>
        </div>
    )
}
