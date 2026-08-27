// Consistent page title block with optional description and actions.
export default function PageHeader({ title, subtitle, actions, children }) {
    return (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="m-0 text-xl font-extrabold tracking-tight text-text-primary md:text-2xl">
                    {title}
                </h1>
                {subtitle && <p className="mt-1 mb-0 text-sm text-text-secondary">{subtitle}</p>}
            </div>
            {(actions || children) && (
                <div className="flex flex-wrap items-center gap-2">{actions || children}</div>
            )}
        </div>
    )
}
