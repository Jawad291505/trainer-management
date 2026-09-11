import { useState, useEffect, useMemo } from 'react'
import { Button, Modal, InputNumber, DatePicker, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useTheme } from '../../../context/ThemeContext'
import { useAuth } from '../../../context/AuthContext'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import ProgressPhotos from '../components/ProgressPhotos'
import StatCard from '../../../components/common/StatCard'
import ChartCard from '../../../components/common/ChartCard'
import ChartTooltip from '../../../components/charts/ChartTooltip'
import ProgressRing from '../components/ProgressRing'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import { api } from '../../../services/api'

export default function MyProgress() {
    const { primary } = useTheme()
    const { message } = App.useApp()
    const { client } = useAuth()

    const [loading, setLoading] = useState(true)
    const [weightEntries, setWeightEntries] = useState([])
    const [completion, setCompletion] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [newWeight, setNewWeight] = useState(null)
    const [newDate, setNewDate] = useState(dayjs())
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        async function load() {
            try {
                const [w, c] = await Promise.all([
                    api.get('/progress/weight'),
                    api.get('/stats/client/completion?days=7').catch(() => null),
                ])
                setWeightEntries((w.items || []).map((e, i) => ({ week: e.label || `W${i + 1}`, weight: e.weightKg })))
                if (c) setCompletion(c)
            } catch { /* */ }
            finally { setLoading(false) }
        }
        load()
    }, [])

    const stats = useMemo(() => {
        const start = weightEntries[0]?.weight ?? client?.startWeight ?? 0
        const current = weightEntries.at(-1)?.weight ?? client?.weight ?? 0
        const target = client?.target ?? 0
        const lost = Math.round((start - current) * 10) / 10
        const toGo = Math.round((current - target) * 10) / 10
        const progressPct = start !== target ? Math.min(100, Math.max(0, Math.round(((start - current) / (start - target)) * 100))) : 0
        return { start, current, target, lost, toGo, progressPct }
    }, [weightEntries, client])

    const handleLogWeight = async () => {
        if (!newWeight || newWeight <= 0) { message.warning('Please enter a valid weight'); return }
        setSaving(true)
        try {
            await api.post('/progress/weight', { weightKg: newWeight, date: newDate.toISOString() })
            const w = await api.get('/progress/weight')
            setWeightEntries((w.items || []).map((e, i) => ({ week: e.label || `W${i + 1}`, weight: e.weightKg })))
            message.success(`Logged ${newWeight} kg`)
            setModalOpen(false)
            setNewWeight(null)
            setNewDate(dayjs())
        } catch { message.error('Failed to log weight') }
        finally { setSaving(false) }
    }

    if (loading) return <LoadingSkeleton />

    const weeklyAvg = completion?.weeklyAveragePct ?? 0

    return (
        <div>
            <PageHeader title="My Progress" subtitle="Look how far you've come. Keep it up!">
                <div className="flex items-center gap-2">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Log Weight</Button>
                    <RequestCorrection area="progress" />
                </div>
            </PageHeader>

            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                <StatCard label="Weight Lost" value={`${stats.lost}kg`} accent="var(--color-success)" hint="Since you started" />
                <StatCard label="Current Weight" value={`${stats.current}kg`} />
                <StatCard label="To Goal" value={`${stats.toGo}kg`} hint={`Target ${stats.target}kg`} />
                <StatCard label="Goal Progress" value={`${stats.progressPct}%`} accent="var(--color-primary)" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard className="lg:col-span-2" title="Weight Journey" subtitle={`${weightEntries.length} weigh-ins (kg)`}>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={weightEntries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                            <defs><linearGradient id="wline" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={primary} /><stop offset="100%" stopColor="var(--color-success)" /></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="week" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                            <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip content={<ChartTooltip />} />
                            <Line type="monotone" dataKey="weight" name="Weight" stroke="url(#wline)" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Weekly Consistency" subtitle="Avg. completion">
                    <div className="flex h-full flex-col items-center justify-center">
                        <ProgressRing value={weeklyAvg} size={150} sublabel="this week" />
                        <p className="mt-4 text-center text-sm text-text-secondary">Consistency beats intensity!</p>
                    </div>
                </ChartCard>
            </div>

            <div className="mt-4"><ProgressPhotos /></div>

            <Modal title="Log Your Weight" open={modalOpen} onCancel={() => { setModalOpen(false); setNewWeight(null); setNewDate(dayjs()) }} onOk={handleLogWeight} okText="Save" okButtonProps={{ loading: saving, disabled: !newWeight }} centered destroyOnHidden>
                <p className="mb-4 text-sm text-text-secondary">Record today's weight so your trainer can track your journey.</p>
                <div className="flex flex-col gap-4">
                    <div><label className="mb-1 block text-sm font-medium text-text-secondary">Weight (kg)</label><InputNumber value={newWeight} onChange={setNewWeight} min={20} max={300} step={0.1} precision={1} placeholder="e.g. 67.5" className="!w-full" size="large" autoFocus /></div>
                    <div><label className="mb-1 block text-sm font-medium text-text-secondary">Date</label><DatePicker value={newDate} onChange={setNewDate} disabledDate={(d) => d && d.isAfter(dayjs(), 'day')} className="!w-full" size="large" /></div>
                </div>
            </Modal>
        </div>
    )
}
