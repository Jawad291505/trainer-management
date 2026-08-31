import { useMemo, useState } from 'react'
import { Progress, Segmented } from 'antd'
import { PlayCircleOutlined, CheckOutlined, CalendarOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import { exercisePlan, trainer } from '../../../services/mockData'

export default function MyExercises() {
    // Track completion across all days, keyed by exercise id.
    const [done, setDone] = useState(() => {
        const seed = {}
        exercisePlan.days.forEach((d) => d.exercises.forEach((e) => (seed[e.id] = !!e.done)))
        return seed
    })
    const [activeDay, setActiveDay] = useState(exercisePlan.todayId)

    const day = useMemo(
        () => exercisePlan.days.find((d) => d.id === activeDay) || exercisePlan.days[0],
        [activeDay],
    )

    const exercises = day.exercises
    const completed = exercises.filter((e) => done[e.id]).length
    const pct = exercises.length ? Math.round((completed / exercises.length) * 100) : 0

    const toggle = (id) => setDone((prev) => ({ ...prev, [id]: !prev[id] }))

    const dayOptions = exercisePlan.days.map((d) => ({
        label: d.id === exercisePlan.todayId ? `${d.focus} · Today` : d.focus,
        value: d.id,
    }))

    return (
        <div>
            <PageHeader title="My Exercise Plan" subtitle={exercisePlan.title}>
                <RequestCorrection area="exercise" items={exercises.map((e) => e.name)} />
            </PageHeader>

            {/* Trainer attribution */}
            <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
                <span>
                    Assigned by <span className="font-semibold text-text-secondary">{trainer.name}</span>
                </span>
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--color-border-strong)' }} />
                <span>Updated {exercisePlan.updatedAt}</span>
            </div>

            {/* Day switcher */}
            <div className="mb-4 overflow-x-auto">
                <Segmented options={dayOptions} value={activeDay} onChange={setActiveDay} />
            </div>

            <div className="app-card mb-4 p-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-semibold text-text-secondary">
                        <CalendarOutlined /> {day.day} — {day.focus}
                    </span>
                    <span className="font-bold text-text-primary">{completed}/{exercises.length}</span>
                </div>
                <Progress percent={pct} strokeColor={pct === 100 ? 'var(--color-success)' : 'var(--color-primary)'} />
            </div>

            <div className="flex flex-col gap-3">
                {exercises.map((ex) => {
                    const isDone = done[ex.id]
                    return (
                        <div key={ex.id} className="app-card p-5" style={isDone ? { borderColor: 'var(--color-success)' } : undefined}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-text-primary">{ex.name}</div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                                        <span className="rounded px-1.5 py-0.5 font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                            {ex.sets} sets × {ex.reps}
                                        </span>
                                        <span>Rest {ex.rest}</span>
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
                            <button
                                onClick={() => toggle(ex.id)}
                                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all"
                                style={{
                                    background: isDone ? 'var(--color-success)' : 'var(--color-primary)',
                                    color: '#fff',
                                }}
                            >
                                <CheckOutlined /> {isDone ? 'Completed' : 'Mark as complete'}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
