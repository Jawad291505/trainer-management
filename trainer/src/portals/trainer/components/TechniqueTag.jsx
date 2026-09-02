import { getTechnique } from '../../../services/exerciseLibrary'

// Small pill that labels an exercise's training technique (TUT / Super Set).
// Renders nothing for the default "standard" technique so existing exercises
// look exactly as before. Used anywhere exercises are displayed.
export default function TechniqueTag({ technique, className = '' }) {
    if (!technique || technique === 'standard') return null
    const info = getTechnique(technique)
    return (
        <span
            className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${className}`}
            style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
            title={info.description}
        >
            {info.label}
        </span>
    )
}
