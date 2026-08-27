import { useLocation, useNavigate } from 'react-router-dom'
import { clientNav, clientBottomNav } from '../../constants/navigation'

// Mobile-only bottom navigation bar for quick access to key pages.
export default function BottomNav() {
    const location = useLocation()
    const navigate = useNavigate()

    const items = clientBottomNav
        .map((key) => clientNav.find((n) => n.key === key))
        .filter(Boolean)

    const isActive = (key) =>
        key === '/' ? location.pathname === '/' : location.pathname.startsWith(key)

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around lg:hidden"
            style={{
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: '0 -2px 12px rgba(16,24,40,0.06)',
            }}
        >
            {items.map(({ key, label, icon: Icon }) => {
                const active = isActive(key)
                return (
                    <button
                        key={key}
                        onClick={() => navigate(key)}
                        className="flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors"
                        style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                    >
                        <Icon style={{ fontSize: 20 }} />
                        <span className="text-[10px] font-semibold">{label.replace('My ', '')}</span>
                    </button>
                )
            })}
        </nav>
    )
}
