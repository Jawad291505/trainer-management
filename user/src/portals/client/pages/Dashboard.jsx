import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, App } from 'antd'
import dayjs from 'dayjs'
import { MessageOutlined, RightOutlined, FireOutlined, CalendarOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ChartCard from '../../../components/common/ChartCard'
import GrowthChart from '../../../components/charts/GrowthChart'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import UserAvatar from '../../../components/common/UserAvatar'
import ProgressRing from '../components/ProgressRing'
import TaskItem from '../components/TaskItem'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'
import { listFollowUps } from '../../../services/followUps'
import { formatTime } from '../../../utils/time'

export default function Dashboard() {
    const navigate = useNavigate()
    const { message } = App.useApp()
    const { user, client } = useAuth()
    const [loading, setLoading] = useState(true)
    const [tasks, setTasks] = useState([])
    const [weightData, setWeightData] = useState([])
    const [trainerInfo, setTrainerInfo] = useState(null)
    const [nextFollowUp, setNextFollowUp] = useState(null)

    useEffect(() => {
        async function load() {
            try {
                const [daily, weight, followUps] = await Promise.all([
                    api.get('/progress/daily'),
                    api.get('/progress/weight'),
                    listFollowUps().catch(() => []),
                ])
                setNextFollowUp(
                    followUps.filter((f) => f.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date))[0] || null,
                )
                setTasks(daily.tasks || [])
                setWeightData((weight.items || []).map((e) => ({ date: dayjs(e.date).format('D MMM'), weight: e.weightKg })))
                // Get trainer info from client profile
                if (client?.trainer) {
                    setTrainerInfo(client.trainer)
                }
            } catch { /* */ }
            finally { setLoading(false) }
        }
        load()
    }, [client])

    const toggle = async (key) => {
        const task = tasks.find((t) => t.key === key)
        if (!task) return
        try {
            const res = await api.patch('/progress/daily', { taskKey: key, done: !task.done })
            setTasks(res.tasks || [])
        } catch { /* */ }
    }

    if (loading) return <LoadingSkeleton cards={2} />

    const done = tasks.filter((t) => t.done).length
    const total = tasks.length
    const pct = total ? Math.round((done / total) * 100) : 0

    const trainerName = trainerInfo?.user?.name || 'Your Trainer'
    const trainerSpec = trainerInfo?.specialization || ''

    return (
        <div>
            <PageHeader title={`Hi ${(user?.name || 'there').split(' ')[0]} 👋`} subtitle="Here's what you need to do today." />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="app-card animate-rise flex flex-col items-center justify-center p-6 lg:col-span-1">
                    <ProgressRing value={pct} size={150} sublabel="completed" />
                    <div className="mt-4 text-center">
                        <div className="text-sm font-semibold text-text-primary">{done} of {total} tasks done</div>
                        <div className="text-xs text-text-muted">{pct === 100 ? 'Amazing work today! 🎉' : 'Keep going, you\'ve got this!'}</div>
                    </div>
                </div>

                <div className="app-card animate-rise flex flex-col p-5 lg:col-span-2">
                    <h3 className="section-title mb-4">Your Trainer</h3>
                    <div className="flex items-center gap-4">
                        <UserAvatar name={trainerName} color={trainerInfo?.user?.avatarColor || '#0b2545'} size={60} />
                        <div className="min-w-0 flex-1">
                            <span className="font-bold text-text-primary">{trainerName}</span>
                            {trainerSpec && <div className="text-xs text-text-muted">{trainerSpec}</div>}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/follow-ups')}
                        className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5 text-left"
                        style={{ background: 'var(--color-surface-secondary)' }}
                    >
                        <span className="flex items-center gap-2 text-sm text-text-secondary">
                            <CalendarOutlined style={{ color: 'var(--color-text-muted)' }} />
                            {nextFollowUp
                                ? <>Next follow-up: <b className="text-text-primary">{dayjs(nextFollowUp.date).format('ddd, D MMM')}{nextFollowUp.time ? ` · ${formatTime(nextFollowUp.time)}` : ''}</b></>
                                : 'No follow-up scheduled yet'}
                        </span>
                        <RightOutlined style={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                    </button>
                    <Button type="primary" icon={<MessageOutlined />} className="mt-3" onClick={() => navigate('/messages')}>Message Trainer</Button>
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
                        <div><div className="text-lg font-extrabold text-text-primary">{client?.progress || 0}%</div><div className="text-[11px] text-text-muted">Goal progress</div></div>
                        <div><div className="text-lg font-extrabold text-text-primary">{client?.weight || '—'}kg</div><div className="text-[11px] text-text-muted">Current</div></div>
                        <div><div className="text-lg font-extrabold text-text-primary">{client?.target || '—'}kg</div><div className="text-[11px] text-text-muted">Target</div></div>
                    </div>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button onClick={() => navigate('/diet')} className="app-card app-card-hover flex items-center justify-between p-5 text-left">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today's nutrition</div>
                        <div className="mt-1 text-lg font-extrabold text-text-primary">View diet plan</div>
                    </div>
                    <RightOutlined style={{ color: 'var(--color-text-muted)' }} />
                </button>
                <button onClick={() => navigate('/exercises')} className="app-card app-card-hover flex items-center justify-between p-5 text-left">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Today's training</div>
                        <div className="mt-1 text-lg font-extrabold text-text-primary">View exercises</div>
                    </div>
                    <RightOutlined style={{ color: 'var(--color-text-muted)' }} />
                </button>
            </div>

            {weightData.length > 0 && (
                <div className="mt-6">
                    <ChartCard title="Weight Journey" subtitle={`${weightData.length} weigh-ins (kg)`}>
                        <GrowthChart data={weightData} dataKey="weight" xKey="date" name="Weight" height={260} />
                    </ChartCard>
                </div>
            )}

            <div className="app-card mt-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="section-title m-0 flex items-center gap-2"><FireOutlined style={{ color: 'var(--color-warning)' }} /> Today's Tasks</h3>
                    <button className="flex items-center gap-1 text-sm font-semibold text-primary" onClick={() => navigate('/schedule')}>Schedule <RightOutlined style={{ fontSize: 11 }} /></button>
                </div>
                <div className="flex flex-col gap-2.5">
                    {tasks.map((t) => (<TaskItem key={t.key} task={{ ...t, id: t.key }} onToggle={() => toggle(t.key)} />))}
                    {tasks.length === 0 && <p className="text-sm text-text-muted">No tasks for today yet.</p>}
                </div>
            </div>
        </div>
    )
}
