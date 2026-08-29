// Status pill mapped to semantic design tokens (no hardcoded colors).
const MAP = {
    active: { label: 'Active', bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    paid: { label: 'Paid', bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    completed: { label: 'Completed', bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    pending: { label: 'Pending', bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    inactive: { label: 'Inactive', bg: 'var(--color-surface-secondary)', fg: 'var(--color-text-muted)' },
    failed: { label: 'Failed', bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
    refunded: { label: 'Refunded', bg: 'var(--color-info-soft)', fg: 'var(--color-info)' },
    open: { label: 'Awaiting reply', bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)' },
    resolved: { label: 'Resolved', bg: 'var(--color-success-soft)', fg: 'var(--color-success)' },
    declined: { label: 'Declined', bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
}

export default function StatusBadge({ status }) {
    const s = MAP[status] || { label: status, bg: 'var(--color-surface-secondary)', fg: 'var(--color-text-secondary)' }
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
            style={{ background: s.bg, color: s.fg }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.fg }} />
            {s.label}
        </span>
    )
}
