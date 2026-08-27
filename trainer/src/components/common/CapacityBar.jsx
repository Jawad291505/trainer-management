// Visual trainer-capacity indicator: current / max with a colored bar.
export default function CapacityBar({ current, max, showLabel = true, size = 'md' }) {
    const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
    const available = Math.max(0, max - current)

    let color = 'var(--color-success)'
    if (pct >= 100) color = 'var(--color-danger)'
    else if (pct >= 85) color = 'var(--color-warning)'

    const height = size === 'sm' ? 6 : 8

    return (
        <div className="w-full">
            {showLabel && (
                <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">
                        {current} / {max}
                    </span>
                    <span className="text-text-muted">{available} available</span>
                </div>
            )}
            <div
                className="w-full overflow-hidden rounded-full"
                style={{ background: 'var(--color-surface-secondary)', height }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: color }}
                />
            </div>
        </div>
    )
}
