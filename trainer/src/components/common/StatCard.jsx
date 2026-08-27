import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

// Premium statistic card with icon, value, trend and supporting text.
export default function StatCard({ icon, label, value, trend, trendUp = true, hint, accent }) {
    const tint = accent || 'var(--color-primary)'
    return (
        <div className="app-card app-card-hover animate-rise p-5 h-full">
            <div className="flex items-start justify-between">
                <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                    style={{ background: 'var(--color-primary-soft)', color: tint }}
                >
                    {icon}
                </div>
                {trend != null && (
                    <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
                        style={{
                            background: trendUp ? 'var(--color-success-soft)' : 'var(--color-danger-soft)',
                            color: trendUp ? 'var(--color-success)' : 'var(--color-danger)',
                        }}
                    >
                        {trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        {trend}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <div className="text-2xl font-extrabold tracking-tight text-text-primary">{value}</div>
                <div className="mt-1 text-sm font-medium text-text-secondary">{label}</div>
                {hint && <div className="mt-1 text-xs text-text-muted">{hint}</div>}
            </div>
        </div>
    )
}
