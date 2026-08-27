import { useLocation, useNavigate } from 'react-router-dom'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { adminNav } from '../../constants/navigation'

function Logo({ collapsed }) {
    return (
        <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? 'justify-center px-0' : ''}`}>
            <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black shadow-lg"
                style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary, #fff)' }}
            >
                FT
            </div>
            {!collapsed && (
                <div className="leading-tight">
                    <div className="text-[15px] font-extrabold text-white">FitTrack</div>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--sidebar-text)' }}>
                        Admin Console
                    </div>
                </div>
            )}
        </div>
    )
}

// Sleek navy sidebar. Fixed dark surface (independent of the accent theme)
// with a soft active pill, left accent indicator and subtle hover states.
export default function Sidebar({ collapsed, onNavigate }) {
    const location = useLocation()
    const navigate = useNavigate()

    const isActive = (key) =>
        key === '/' ? location.pathname === '/' : location.pathname.startsWith(key)

    return (
        <div
            className="relative flex h-full flex-col"
            style={{
                background:
                    'linear-gradient(180deg, var(--sidebar-bg) 0%, var(--sidebar-bg-deep) 100%)',
                borderRight: '1px solid var(--sidebar-border)',
            }}
        >
            <Logo collapsed={collapsed} />

            {!collapsed && (
                <div
                    className="px-6 pb-2 text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                    Menu
                </div>
            )}

            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                {adminNav.map(({ key, label, icon: Icon }) => {
                    const active = isActive(key)
                    return (
                        <button
                            key={key}
                            onClick={() => {
                                navigate(key)
                                onNavigate?.()
                            }}
                            title={collapsed ? label : undefined}
                            className="group relative mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-all duration-200 ease-out"
                            style={{
                                border: 'none',
                                background: active ? '#ffffff' : 'transparent',
                                color: active ? 'var(--sidebar-bg)' : 'var(--sidebar-text)',
                                boxShadow: active ? '0 4px 14px rgba(0, 0, 0, 0.25)' : 'none',
                                justifyContent: collapsed ? 'center' : 'flex-start',
                            }}
                            onMouseEnter={(e) => {
                                if (!active) {
                                    e.currentTarget.style.background = 'var(--sidebar-surface-hover)'
                                    e.currentTarget.style.color = 'var(--sidebar-text-active)'
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!active) {
                                    e.currentTarget.style.background = 'transparent'
                                    e.currentTarget.style.color = 'var(--sidebar-text)'
                                }
                            }}
                        >
                            <Icon style={{ fontSize: 18 }} />
                            {!collapsed && <span>{label}</span>}
                        </button>
                    )
                })}
            </nav>

            {!collapsed && (
                <div
                    className="m-3 rounded-2xl p-4"
                    style={{ background: 'var(--sidebar-surface)', border: '1px solid var(--sidebar-border)' }}
                >
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <QuestionCircleOutlined />
                        Need help?
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--sidebar-text)' }}>
                        Visit the docs or reach support anytime.
                    </div>
                </div>
            )}
        </div>
    )
}
