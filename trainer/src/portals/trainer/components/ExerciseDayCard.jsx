import { PlayCircleOutlined } from '@ant-design/icons'

// Displays a single training day and its exercises.
export default function ExerciseDayCard({ day }) {
    return (
        <div className="app-card flex flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <div className="font-bold text-text-primary">{day.day}</div>
                    <div className="text-xs text-text-muted">{day.focus}</div>
                </div>
                <span className="rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                    {day.exercises.length} exercises
                </span>
            </div>

            <div className="flex flex-col gap-2">
                {day.exercises.map((ex, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-text-primary">{ex.name}</span>
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
                            <span>{ex.sets} sets × {ex.reps}</span>
                            <span>· Rest {ex.rest}</span>
                        </div>
                        {ex.notes && <div className="mt-1 text-xs italic text-text-secondary">{ex.notes}</div>}
                    </div>
                ))}
            </div>
        </div>
    )
}
