import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Progress, Segmented } from 'antd'
import { PlayCircleOutlined, CheckCircleFilled, CalendarOutlined, ThunderboltOutlined, RightOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import PageSpin from '../../../components/common/PageSpin'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'
import { getTechnique } from '../../../services/exerciseLibrary'

export default function MyExercises() {
    const navigate = useNavigate()
    const { client } = useAuth()
    const [exercisePlan, setExercisePlan] = useState(null)
    const [daySession, setDaySession] = useState(null) // { session, day } for the active day
    const [loading, setLoading] = useState(true)

    const planId = exercisePlan?._id || exercisePlan?.id

    useEffect(() => {
        if (!client) return
        api.get(`/clients/${client._id || client.id}/exercise-plan`).then((plan) => {
            setExercisePlan(plan)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [client])

    const [activeDay, setActiveDay] = useState(null)

    const days = exercisePlan?.days || []
    const todayId = exercisePlan?.todayDayId || days[0]?._id || days[0]?.id || null

    useEffect(() => { if (todayId && !activeDay) setActiveDay(todayId) }, [todayId, activeDay])

    // Any day can be started/redone at any time — not just the plan's "today"
    // day — so re-fetch that day's own session status whenever it changes.
    useEffect(() => {
        if (!planId || !activeDay) return
        setDaySession(null)
        api.get(`/exercise-plans/${planId}/sessions/day/${activeDay}`).then(setDaySession).catch(() => { })
    }, [planId, activeDay])

    const day = useMemo(
        () => days.find((d) => (d._id || d.id) === activeDay) || days[0] || { exercises: [] },
        [activeDay, days],
    )

    const exercises = day?.exercises || []
    const completed = exercises.filter((e) => e.done).length
    const pct = exercises.length ? Math.round((completed / exercises.length) * 100) : 0

    const startWorkout = async () => {
        if (!planId || !activeDay) return
        try {
            await api.post(`/exercise-plans/${planId}/sessions/start`, { dayId: activeDay })
        } catch { /* no-op */ }
        navigate('/workout', { state: { planId, dayId: activeDay } })
    }

    const dayOptions = days.map((d) => ({
        label: (d._id || d.id) === todayId ? `${d.focus} · Today` : d.focus,
        value: d._id || d.id,
    }))

    if (loading) return <PageSpin />

    const session = daySession?.session

    return (
        <div>
            <PageHeader title="My Exercise Plan" subtitle={exercisePlan?.title || 'No plan assigned'}>
                <RequestCorrection area="exercise" items={exercises.map((e) => e.name)} />
            </PageHeader>

            {/* Trainer attribution */}
            <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
                <span>
                    Assigned by <span className="font-semibold text-text-secondary">your trainer</span>
                </span>
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--color-border-strong)' }} />
                <span>Updated {exercisePlan?.updatedAt ? new Date(exercisePlan.updatedAt).toLocaleDateString('en-CA') : '—'}</span>
            </div>

            {/* Day switcher */}
            <div className="mb-4 overflow-x-auto">
                <Segmented options={dayOptions} value={activeDay} onChange={setActiveDay} />
            </div>

            {day?.note && (
                <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    {day.note}
                </div>
            )}

            <div className="app-card mb-4 p-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-text-secondary">
                        <CalendarOutlined /> {day.day} — {day.focus}
                    </span>
                    <span className="font-bold text-text-primary">{completed}/{exercises.length}</span>
                </div>
                <Progress percent={pct} strokeColor={pct === 100 ? 'var(--color-success)' : 'var(--color-primary)'} />
            </div>

            {exercises.length > 0 && (
                <button
                    onClick={startWorkout}
                    className="app-card mb-4 flex w-full items-center justify-between p-5 text-left transition-all"
                    style={{ borderColor: session?.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)' }}
                >
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                            style={{
                                background: session?.status === 'completed' ? 'var(--color-success-soft)' : 'var(--color-primary-soft)',
                                color: session?.status === 'completed' ? 'var(--color-success)' : 'var(--color-primary)',
                            }}
                        >
                            {session?.status === 'completed' ? <CheckCircleFilled /> : <ThunderboltOutlined />}
                        </span>
                        <div>
                            <div className="font-bold text-text-primary">
                                {session?.status === 'completed'
                                    ? 'Workout completed — Start again'
                                    : session?.status === 'in_progress'
                                        ? `Resume workout — ${session.doneSets}/${session.totalSets} sets`
                                        : 'Start Workout'}
                            </div>
                            <div className="text-xs text-text-muted">
                                {session?.status === 'completed'
                                    ? `Logged ${session.doneSets}/${session.totalSets} sets — tap to do it again`
                                    : 'Log sets, reps, weight & duration as you go'}
                            </div>
                        </div>
                    </div>
                    <RightOutlined className="text-text-muted" />
                </button>
            )}

            <div className="flex flex-col gap-3">
                {exercises.map((ex) => {
                    const exId = ex._id || ex.id
                    const isDone = ex.done
                    return (
                        <div key={exId} className="app-card p-5" style={isDone ? { borderColor: 'var(--color-success)' } : undefined}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-bold text-text-primary">{ex.name}</span>
                                        {isDone && <CheckCircleFilled style={{ color: 'var(--color-success)' }} />}
                                        {ex.technique && ex.technique !== 'standard' && (
                                            <span
                                                className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
                                                style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
                                                title={getTechnique(ex.technique).description}
                                            >
                                                {getTechnique(ex.technique).label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                                        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                            {ex.sets} sets × {ex.trackingType === 'duration' ? `${ex.targetDuration || ex.reps}s` : ex.reps}
                                        </span>
                                        <span>Rest {ex.rest}</span>
                                        {ex.targetWeight ? <span>{ex.targetWeight}kg</span> : null}
                                    </div>
                                    {ex.instructions && <div className="mt-2 text-sm text-text-secondary">{ex.instructions}</div>}
                                    {ex.youtube && (
                                        <a
                                            href={ex.youtube}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                                            style={{ color: 'var(--color-danger)' }}
                                        >
                                            <PlayCircleOutlined /> Watch demo
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
