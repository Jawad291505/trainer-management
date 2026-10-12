import { BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'
import YouTubePreview from '../../../components/common/YouTubePreview'
import { getTechnique } from '../../../services/exerciseLibrary'

// The techniques a trainer attached to an exercise (or to a group of linked
// exercises): title, instructions, an embedded video preview and the plain
// YouTube link as a fallback.
//
// `method` is the exercise's training-method key (TUT / Super Set); when it isn't
// the default it gets the same box, with its description written out in full.
export default function TechniqueDetails({ techniques, method, className = '' }) {
    const preset = method && method !== 'standard' ? getTechnique(method) : null
    const items = [
        ...(preset ? [{ _id: `method-${preset.key}`, title: preset.label, instructions: preset.description }] : []),
        ...(techniques || []),
    ]
    if (!items.length) return null
    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {items.map((t, i) => (
                <div key={t._id || i} className="rounded-xl p-3 sm:p-4" style={{ background: 'var(--color-surface-secondary)' }}>
                    <div className="flex items-start gap-2">
                        <BulbOutlined className="mt-0.5 shrink-0" style={{ color: 'var(--color-info)' }} />
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-info)' }}>Technique</div>
                            <div className="break-words text-sm font-bold text-text-primary">{t.title}</div>
                        </div>
                    </div>
                    {t.instructions && <p className="mb-0 mt-2 whitespace-pre-line break-words text-sm text-text-secondary">{t.instructions}</p>}
                    {t.youtube && (
                        <div className="mt-3 max-w-xl">
                            <YouTubePreview url={t.youtube} title={t.title} />
                            <a
                                href={t.youtube}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                                style={{ color: 'var(--color-danger)' }}
                            >
                                <PlayCircleOutlined /> Watch on YouTube
                            </a>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
