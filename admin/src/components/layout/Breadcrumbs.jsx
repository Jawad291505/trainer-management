import { Link, useLocation } from 'react-router-dom'
import { adminNav } from '../../constants/navigation'

const LABELS = adminNav.reduce((acc, n) => {
    acc[n.key.replace('/', '') || 'dashboard'] = n.label
    return acc
}, {})

// Lightweight breadcrumb trail derived from the current route.
export default function Breadcrumbs() {
    const { pathname } = useLocation()
    const parts = pathname.split('/').filter(Boolean)

    return (
        <nav className="mb-4 flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <Link to="/" className="hover:text-primary">
                Home
            </Link>
            {parts.map((p, i) => {
                const to = '/' + parts.slice(0, i + 1).join('/')
                const label = LABELS[p] || p.charAt(0).toUpperCase() + p.slice(1)
                const last = i === parts.length - 1
                return (
                    <span key={to} className="flex items-center gap-1.5">
                        <span>/</span>
                        {last ? (
                            <span className="text-text-secondary">{label}</span>
                        ) : (
                            <Link to={to} className="hover:text-primary">
                                {label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}
