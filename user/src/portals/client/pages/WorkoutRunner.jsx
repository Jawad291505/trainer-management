import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, InputNumber, Input, Progress } from 'antd'
import {
    LeftOutlined, RightOutlined, CheckOutlined, PlayCircleOutlined,
    TrophyOutlined, ClockCircleOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import PageSpin from '../../../components/common/PageSpin'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'

// Parses "60s" / "90 sec" / "2min" into seconds; falls back to 60.
function parseRestSeconds(rest) {
    if (!rest) return 60
    const m = String(rest).match(/(\d+)\s*(min|m)?/i)
    if (!m) return 60
    const n = Number(m[1])
    return /min|m$/i.test(m[2] || '') ? n * 60 : n
}

function RestTimer({ seconds, onDone, onSkip }) {
    const [left, setLeft] = useState(seconds)
    useEffect(() => {
        if (left <= 0) { onDone(); return }
        const t = setTimeout(() => setLeft((s) => s - 1), 1000)
        return () => clearTimeout(t)
    }, [left, onDone])
    return (
        <div className="app-card mb-4 flex items-center justify-between p-4" style={{ borderColor: 'var(--color-info)' }}>
            <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
                <ClockCircleOutlined /> Rest — {left}s
            </span>
            <Button size="small" onClick={onSkip}>Skip</Button>
        </div>
    )
}

export default function WorkoutRunner() {
    const navigate = useNavigate()
    const location = useLocation()
    const { client } = useAuth()
    const dayId = location.state?.dayId
    const statePlanId = location.state?.planId // handed over by My Exercises
    const clientId = client?._id || client?.id
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [exIdx, setExIdx] = useState(0)
    const [resting, setResting] = useState(false)
    const [finishNotes, setFinishNotes] = useState('')
    const [finishing, setFinishing] = useState(false)
    const [summary, setSummary] = useState(null)
    const draftsRef = useRef({}) // "exIdx-setIdx" -> { actualReps, actualWeight, actualDuration }

    useEffect(() => {
        if (!clientId) return
        let cancelled = false
        async function load() {
            setLoading(true)
            try {
                // My Exercises already knows the plan id — only look it up on a direct visit.
                let planId = statePlanId
                if (!planId) {
                    const plan = await api.get(`/clients/${clientId}/exercise-plan`)
                    planId = plan?._id || plan?.id
                }
                if (!planId) return
                const started = await api.post(`/exercise-plans/${planId}/sessions/start`, dayId ? { dayId } : {})
                if (!cancelled) {
                    setSession(started)
                    if (started.status === 'completed') setSummary(started)
                }
            } catch { /* no-op */ } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clientId])

    if (loading) return <PageSpin />
    if (!session) {
        return (
            <div>
                <PageHeader title="Workout" />
                <div className="app-card p-8 text-center text-text-muted">No workout to start today.</div>
            </div>
        )
    }

    const sessionId = session._id || session.id
    const exercises = session.exercises || []
    const exercise = exercises[exIdx]
    const isLast = exIdx === exercises.length - 1

    const setDraft = (setIdx, patch) => {
        const key = `${exIdx}-${setIdx}`
        draftsRef.current[key] = { ...draftsRef.current[key], ...patch }
        setSession((s) => ({ ...s })) // force re-render to reflect input state
    }
    const getDraft = (setIdx, set) => draftsRef.current[`${exIdx}-${setIdx}`] || {
        actualReps: set.actualReps,
        actualWeight: set.actualWeight,
        actualDuration: set.actualDuration,
    }

    const completeSet = async (setIdx) => {
        const set = exercise.sets[setIdx]
        const draft = getDraft(setIdx, set)
        const updated = await api.patch(
            `/workout-sessions/${sessionId}/exercises/${exIdx}/sets/${setIdx}`,
            { ...draft, completed: true },
        )
        setSession(updated)
        if (setIdx < exercise.sets.length - 1) setResting(true)
    }

    const goNext = () => {
        setResting(false)
        setExIdx((i) => Math.min(i + 1, exercises.length - 1))
    }
    const goPrev = () => {
        setResting(false)
        setExIdx((i) => Math.max(i - 1, 0))
    }

    const finish = async () => {
        setFinishing(true)
        try {
            const finished = await api.post(`/workout-sessions/${sessionId}/finish`, { notes: finishNotes })
            setSummary(finished)
        } finally {
            setFinishing(false)
        }
    }

    if (summary) {
        return (
            <div>
                <PageHeader title="Workout Summary" />
                <div className="app-card flex flex-col items-center p-8 text-center">
                    <TrophyOutlined className="mb-3 text-4xl" style={{ color: 'var(--color-success)' }} />
                    <div className="text-2xl font-extrabold text-text-primary">{summary.doneSets}/{summary.totalSets} sets completed</div>
                    <div className="mt-1 text-sm text-text-muted">{summary.completionPct}% of today's workout</div>
                    <Progress className="mt-4 w-full" percent={summary.completionPct} strokeColor="var(--color-success)" />
                    <Button type="primary" className="mt-6" onClick={() => navigate('/exercises')}>Back to My Workouts</Button>
                </div>
            </div>
        )
    }

    const totalSetsDone = exercises.reduce((s, e) => s + e.sets.filter((x) => x.completed).length, 0)
    const totalSets = exercises.reduce((s, e) => s + e.sets.length, 0)

    return (
        <div>
            <PageHeader title={session.day ? `${session.day} — ${session.focus}` : 'Workout'} subtitle={`Exercise ${exIdx + 1} of ${exercises.length}`} />

            {session.dayNote && (
                <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    {session.dayNote}
                </div>
            )}

            <div className="app-card mb-4 p-4">
                <Progress percent={totalSets ? Math.round((totalSetsDone / totalSets) * 100) : 0} strokeColor="var(--color-primary)" />
                <div className="mt-1 text-xs text-text-muted">{totalSetsDone}/{totalSets} sets logged</div>
            </div>

            {exercise && (
                <div className="app-card p-5">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-lg font-bold text-text-primary">{exercise.name}</div>
                            {exercise.instructions && <div className="mt-1 text-sm text-text-secondary">{exercise.instructions}</div>}
                        </div>
                        {exercise.youtube && (
                            <a href={exercise.youtube} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                                <PlayCircleOutlined className="text-xl" />
                            </a>
                        )}
                    </div>

                    {resting && (
                        <RestTimer
                            seconds={parseRestSeconds(exercise.targetRest)}
                            onDone={() => setResting(false)}
                            onSkip={() => setResting(false)}
                        />
                    )}

                    <div className="mt-4 flex flex-col gap-2">
                        {exercise.sets.map((set, si) => {
                            const draft = getDraft(si, set)
                            return (
                                <div
                                    key={si}
                                    className="flex flex-wrap items-center gap-2 rounded-xl p-3"
                                    style={{ background: 'var(--color-surface-secondary)', borderLeft: `3px solid ${set.completed ? 'var(--color-success)' : 'var(--color-border)'}` }}
                                >
                                    <span className="w-14 text-sm font-semibold text-text-primary">Set {set.setNumber}</span>

                                    {exercise.trackingType === 'duration' ? (
                                        <InputNumber
                                            min={0}
                                            placeholder={`${set.targetDuration ?? ''}s target`}
                                            value={draft.actualDuration}
                                            onChange={(v) => setDraft(si, { actualDuration: v })}
                                            addonAfter="sec"
                                            style={{ width: 140 }}
                                            disabled={set.completed}
                                        />
                                    ) : (
                                        <InputNumber
                                            min={0}
                                            placeholder={`${set.targetReps} target`}
                                            value={draft.actualReps}
                                            onChange={(v) => setDraft(si, { actualReps: v })}
                                            addonAfter="reps"
                                            style={{ width: 140 }}
                                            disabled={set.completed}
                                        />
                                    )}

                                    <InputNumber
                                        min={0}
                                        placeholder={set.targetWeight ? `${set.targetWeight}kg` : 'weight'}
                                        value={draft.actualWeight}
                                        onChange={(v) => setDraft(si, { actualWeight: v })}
                                        addonAfter="kg"
                                        style={{ width: 130 }}
                                        disabled={set.completed}
                                    />

                                    <Button
                                        type={set.completed ? 'default' : 'primary'}
                                        icon={<CheckOutlined />}
                                        disabled={set.completed}
                                        onClick={() => completeSet(si)}
                                        className="ml-auto"
                                    >
                                        {set.completed ? 'Done' : 'Complete set'}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>

                    {isLast && (
                        <div className="mt-4">
                            <div className="mb-1 text-xs font-semibold text-text-secondary">Notes for your trainer (optional)</div>
                            <Input.TextArea rows={2} value={finishNotes} onChange={(e) => setFinishNotes(e.target.value)} placeholder="How did it feel?" />
                        </div>
                    )}
                </div>
            )}

            <div className="mt-4 flex items-center justify-between">
                <Button icon={<LeftOutlined />} onClick={goPrev} disabled={exIdx === 0}>Previous</Button>
                {isLast ? (
                    <Button type="primary" icon={<TrophyOutlined />} loading={finishing} onClick={finish}>Finish Workout</Button>
                ) : (
                    <Button type="primary" icon={<RightOutlined />} onClick={goNext}>Next exercise</Button>
                )}
            </div>
        </div>
    )
}
