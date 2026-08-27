// Responsive toolbar that wraps a search input + filter controls.
export default function FilterBar({ children, className = '' }) {
    return (
        <div className={`mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center ${className}`}>
            {children}
        </div>
    )
}
