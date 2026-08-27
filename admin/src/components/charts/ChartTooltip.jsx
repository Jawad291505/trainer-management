// Shared premium tooltip for all Recharts charts.
export default function ChartTooltip({ active, payload, label, formatter }) {
    if (!active || !payload || !payload.length) return null
    return (
        <div
            className="rounded-xl px-3 py-2 text-xs"
            style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-soft)',
            }}
        >
            {label != null && (
                <div className="mb-1 font-bold text-text-primary">{label}</div>
            )}
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
                    <span className="text-text-secondary">{entry.name}:</span>
                    <span className="font-semibold text-text-primary">
                        {formatter ? formatter(entry.value, entry.name) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}
