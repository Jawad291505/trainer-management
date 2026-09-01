import { useState } from 'react'
import { Progress } from 'antd'
import { PlayCircleOutlined, CheckOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import { exercisePlan } from '../../../services/mockData'

export default function MyExercises() {
    const [exercises, setExercises] = useState(exercisePlan.exercises)

    const completed = exercises.filter((e) => e.done).length
    const pct = Math.round((completed / exercises.length) * 100)

    const toggle = (id) => setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e)))

    return (
        <div>
            <PageHeader title="My Exercise Plan" subtitle={`${exercisePlan.title} · Today: ${exercisePlan.today}${exercisePlan.source ? ` · ${exercisePlan.source}` : ''}`}>
                <RequestCorrection area="exercise" items={exercisePlan.exercises.map((e) => e.name)} />
            </PageHeader>

            <div className="app-card mb-4 p-4">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold text-text-secondary">Exercises completed</span>
                    <span className="font-bold text-text-primary">{completed}/{exercises.length}</span>
                </div>
                <Progress percent={pct} strokeColor="var(--color-primary)" />
            </div>

            <div className="flex flex-col gap-3">
                {exercises.map((ex) => (
                    <div key={ex.id} className="app-card p-5" style={ex.done ? { borderColor: 'var(--color-success)' } : undefined}>
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
                                background: ex.done ? 'var(--color-success)' : 'var(--color-primary)',
                                color: '#fff',
                            }}
                        >
                            <CheckOutlined /> {ex.done ? 'Completed' : 'Mark as complete'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
