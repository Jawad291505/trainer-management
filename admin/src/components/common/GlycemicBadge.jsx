import { glycemicMeta } from '../../utils/nutrition'

// Small pill showing a glycemic level (Low / Medium / High) with a value.
// `type` selects the label prefix (GI or GL).
export default function GlycemicBadge({ type = 'GL', value, level }) {
    const meta = glycemicMeta[level] || glycemicMeta.low
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: meta.soft, color: meta.color }}
            title={`${type} ${value} — ${meta.label}`}
        >
            {type} {value}
        </span>
    )
}
