import { useMemo, useState } from 'react'
import { Select, Button, DatePicker, App } from 'antd'
import {
    DollarOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    DownloadOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import UserAvatar from '../../../components/common/UserAvatar'
import RevenueChart from '../../../components/charts/RevenueChart'
import DonutChart from '../../../components/charts/DonutChart'
import { payments as seed, revenueTrend, getStats, trainers } from '../../../services/mockData'

const money = (v) => `$${v.toLocaleString()}`

export default function Payments() {
    const { message } = App.useApp()
    const stats = useMemo(() => getStats(), [])
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const [method, setMethod] = useState('all')

    const methods = useMemo(() => Array.from(new Set(seed.map((p) => p.method))), [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return seed.filter((p) => {
            const matchQ = !q || p.clientName.toLowerCase().includes(q) || p.txnId.includes(q)
            const matchS = status === 'all' || p.status === status
            const matchM = method === 'all' || p.method === method
            return matchQ && matchS && matchM
        })
    }, [search, status, method])

    const cards = [
        { icon: <DollarOutlined />, label: 'Total Revenue', value: money(stats.totalRevenue), hint: `${stats.paidCount} paid` },
        { icon: <CheckCircleOutlined />, label: 'Paid', value: stats.paidCount, accent: 'var(--color-success)' },
        { icon: <ClockCircleOutlined />, label: 'Pending', value: stats.pendingCount, hint: money(stats.pendingAmount), accent: 'var(--color-warning)' },
        { icon: <CloseCircleOutlined />, label: 'Failed / Refunded', value: stats.failedCount + stats.refundedCount, accent: 'var(--color-danger)' },
    ]

    const columns = [
        {
            title: 'Client',
            dataIndex: 'clientName',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <UserAvatar name={r.clientName} color={r.clientAvatar} size={34} />
                    <span className="font-semibold text-text-primary">{r.clientName}</span>
                </div>
            ),
        },
        { title: 'Trainer', dataIndex: 'trainerName', width: 160, render: (t) => <span className="text-text-secondary">{t}</span> },
        { title: 'Plan', dataIndex: 'plan', width: 110, render: (p) => <span className="font-medium text-text-primary">{p}</span> },
        { title: 'Amount', dataIndex: 'amount', width: 110, sorter: (a, b) => a.amount - b.amount, render: (a) => <span className="font-bold text-text-primary">{money(a)}</span> },
        { title: 'Date', dataIndex: 'date', width: 120, sorter: (a, b) => a.date.localeCompare(b.date), render: (d) => <span className="text-text-secondary">{d}</span> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Method', dataIndex: 'method', width: 170, render: (m) => <span className="text-text-secondary">{m}</span> },
        { title: 'Transaction', dataIndex: 'txnId', width: 140, render: (t) => <span className="font-mono text-xs text-text-muted">{t}</span> },
    ]

    return (
        <div>
            <PageHeader title="Payments" subtitle="Revenue, invoices and transaction history.">
                <Button icon={<DownloadOutlined />} onClick={() => message.success('Export started')}>
                    Export
                </Button>
            </PageHeader>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((c, i) => (
                    <StatCard key={i} {...c} />
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Revenue Trend" subtitle="Monthly revenue">
                    <RevenueChart data={revenueTrend} />
                </ChartCard>
                <ChartCard title="Payment Status" subtitle="Distribution by state">
                    <DonutChart data={stats.paymentStatusData} useStatusColors centerLabel="payments" />
                </ChartCard>
            </div>

            <div className="mt-6">
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search client or txn…" />
                    <Select
                        value={status}
                        onChange={setStatus}
                        style={{ width: 150 }}
                        options={[
                            { value: 'all', label: 'All status' },
                            { value: 'paid', label: 'Paid' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'failed', label: 'Failed' },
                            { value: 'refunded', label: 'Refunded' },
                        ]}
                    />
                    <Select
                        value={method}
                        onChange={setMethod}
                        style={{ width: 190 }}
                        options={[{ value: 'all', label: 'All methods' }, ...methods.map((m) => ({ value: m, label: m }))]}
                    />
                    <DatePicker.RangePicker className="sm:ml-auto" />
                </FilterBar>

                <DataTable columns={columns} dataSource={filtered} pageSize={9} scrollX={1150} />
            </div>
        </div>
    )
}
