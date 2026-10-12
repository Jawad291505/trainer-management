import { PlayCircleOutlined, CheckCircleFilled, StarFilled, LinkOutlined } from '@ant-design/icons'
import TechniqueTag from './TechniqueTag'
import TechniqueChips from './TechniqueChips'
import { groupLinked, getLinkType } from '../../../utils/exerciseLinks'

function ExerciseRow({ ex, step }) {
    return (
        <div
            className="rounded-xl p-3"
            style={{
                background: step ? 'var(--color-surface)' : 'var(--color-surface-secondary)',
                borderLeft: `3px solid ${ex.done ? 'var(--color-success)' : 'var(--color-border)'}`,
            }}
        >
            {ex.category && (
                <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>{ex.category}</div>
            )}
            <div className="flex items-center justify-between">
                <span className="flex min-w-0 items-center gap-2">
                    {step && (
                        <span
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                            style={{ background: 'var(--color-primary)', color: '#fff' }}
                        >
                            {step}
                        </span>
                    )}
                    {ex.done && <CheckCircleFilled style={{ color: 'var(--color-success)', fontSize: 14 }} />}
                    <span className={`truncate text-sm font-semibold ${ex.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>{ex.name}</span>
                    {ex.important && (
                        <span
                            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                            style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
                        >
                            <StarFilled /> Important
                        </span>
                    )}
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
            <TechniqueChips techniques={ex.techniques} className="mt-1.5" />
        </div>
    )
}

// Displays a single training day and its exercises; linked exercises (supersets
// etc.) are boxed together in their performing order.
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
                {groupLinked(day.exercises, day.links).map((block, bi) => (block.link ? (
                    <div
                        key={block.link.key}
                        className="rounded-xl p-2"
                        style={{ border: '1px solid var(--color-primary)', background: 'var(--color-primary-soft)' }}
                    >
                        <div className="flex items-center gap-1.5 px-1 text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                            <LinkOutlined /> {getLinkType(block.link.type).label} · {block.exercises.length} exercises
                        </div>
                        {block.link.note && <div className="px-1 text-xs text-text-secondary">{block.link.note}</div>}
                        <TechniqueChips techniques={block.link.techniques} className="mt-1 px-1" />
                        <div className="mt-2 flex flex-col gap-2">
                            {block.exercises.map((ex, i) => <ExerciseRow key={ex._id || i} ex={ex} step={i + 1} />)}
                        </div>
                    </div>
                ) : (
                    <ExerciseRow key={block.exercises[0]._id || bi} ex={block.exercises[0]} />
                )))}
            </div>
        </div>
    )
}
