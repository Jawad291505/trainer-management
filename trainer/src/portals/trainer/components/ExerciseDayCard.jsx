import { PlayCircleOutlined, CheckCircleFilled } from '@ant-design/icons'
import TechniqueTag from './TechniqueTag'

// Displays a single training day and its exercises.
export default function ExerciseDayCard({ day }) {
    const completed = day.exercises.filter((e) => e.done).length
    const total = day.exercises.length
    const pct = total ? Math.round((completed / total) * 100) : 0

    return (
        <div className="app-card flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className="font-bold text-text-primary">{day.day}</div>
                    <div className="text-xs text-text-muted">{day.focus}</div>
                </div>
                <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: pct === 100 ? 'var(--color-success-soft)' : 'var(--color-primary-soft)', color: pct === 100 ? 'var(--color-success)' : 'var(--color-primary)' }}>
                    {completed}/{total} done
                </span>
            </div>

            {day.note && (
                <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    {day.note}
                </div>
            )}

            <div className="flex flex-col gap-2">
                {day.exercises.map((ex, i) => (
                    <div
                        key={i}
                        className="rounded-xl p-3"
                        style={{
                            background: 'var(--color-surface-secondary)',
                            borderLeft: `3px solid ${ex.done ? 'var(--color-success)' : 'var(--color-border)'}`,
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex min-w-0 items-center gap-2">
                                {ex.done && <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 14 }} />}
                                <span className={`truncate text-sm font-semibold ${ex.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{ex.name}</span>
                                <TechniqueTag technique={ex.technique} />
                            </span>
                            {ex.youtube && (
                                <a
                                    href={ex.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: 'var(--color-danger)' }}
                                >
                                    <PlayCircleOutlined /> Video
                                </a>
                            )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
                            <span>{ex.sets} sets × {ex.trackingType === 'duration' ? `${ex.targetDuration || ex.reps}s` : ex.reps}</span>
                            <span>· Rest {ex.rest}</span>
                            {ex.targetWeight ? <span>· {ex.targetWeight}kg</span> : null}
                        </div>
                        {(ex.notes || ex.instructions) && <div className="mt-1 text-xs italic text-text-secondary">{ex.notes || ex.instructions}</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}
