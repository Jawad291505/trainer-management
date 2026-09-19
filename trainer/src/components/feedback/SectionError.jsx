import { Button } from 'antd'
import { ExclamationCircleOutlined } from '@ant-design/icons'

// Inline error state for one API-driven section, with an optional retry — so a
// failed request is never mistaken for "no data" and never blocks other sections.
export default function SectionError({ title = "Couldn't load this section", error, onRetry, className = '' }) {
    return (
        <div className={`flex flex-col items-center gap-2 rounded-xl px-6 py-8 text-center ${className}`} style={{ background: 'var(--color-surface-secondary)' }}>
            <ExclamationCircleOutlined style={{ fontSize: 22, color: 'var(--color-danger)' }} />
            <div className="text-sm font-semibold text-text-primary">{title}</div>
            {error?.message && <div className="max-w-sm text-xs text-text-muted">{error.message}</div>}
            {onRetry && <Button size="small" onClick={onRetry}>Try again</Button>}
        </div>
    )
}
