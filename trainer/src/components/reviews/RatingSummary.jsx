import { Rate } from 'antd'

// Average rating + star-by-star breakdown. `summary` is the `summary` object the
// /reviews endpoint returns: { average, count, distribution: { 5: n, 4: n, ... } }.
export default function RatingSummary({ summary }) {
    const { average = 0, count = 0, distribution = {} } = summary || {}
    return (
        <div className="app-card flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
            <div className="shrink-0 text-center sm:w-40">
                <div className="text-4xl font-extrabold tracking-tight text-text-primary">{count ? average.toFixed(1) : '–'}</div>
                <Rate disabled allowHalf value={average} style={{ fontSize: 16 }} />
                <div className="mt-1 text-xs text-text-muted">{count} review{count === 1 ? '' : 's'}</div>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                    const n = distribution[star] || 0
                    return (
                        <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-8 shrink-0 font-semibold text-text-secondary">{star} ★</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-surface-secondary)' }}>
                                <div className="h-full rounded-full" style={{ width: count ? `${(n / count) * 100}%` : 0, background: 'var(--color-warning)' }} />
                            </div>
                            <span className="w-8 shrink-0 text-right text-text-muted">{n}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
