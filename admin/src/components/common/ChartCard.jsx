// Card wrapper for charts with a title, optional subtitle and toolbar.
export default function ChartCard({ title, subtitle, extra, children, className = '' }) {
    return (
        <div className={`app-card animate-rise flex h-full flex-col p-5 ${className}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h3 className="section-title m-0">{title}</h3>
                    {subtitle && <p className="mt-0.5 mb-0 text-xs text-text-muted">{subtitle}</p>}
                </div>
                {extra}
            </div>
            <div className="flex-1">{children}</div>
        </div>
    )
}
