import { useLocation, useNavigate } from 'react-router-dom'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { clientNavGroups } from '../../constants/navigation'
import { useCorrections } from '../../context/CorrectionsContext'

const NAV_GROUPS = clientNavGroups
const BRAND_SUBTITLE = 'My Fitness'

function Logo({ collapsed }) {
    return (
        <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? 'justify-center px-0' : ''}`}>
            <div className="sidebar-brand flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black">
                FT
            </div>
            {!collapsed && (
                <div className="leading-tight">
                    <div className="text-[15px] font-extrabold text-white">FitTrack</div>
                    <div className="text-[11px] font-medium" style={{ color: 'var(--sidebar-text)' }}>
                        {BRAND_SUBTITLE}
                    </div>
                </div>
            )}
        </div>
    )
}

// Sleek dark sidebar. The surface is a gradient-touched tint of the accent
// theme; navigation is split into labelled sections, each with a heading and a
// short caption describing what its items do.
export default function Sidebar({ collapsed, onNavigate }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { openCount } = useCorrections()
    const badgeCounts = { corrections: openCount }

    const isActive = (key) =>
        key === '/' ? location.pathname === '/' : location.pathname.startsWith(key)

    return (
        <div className="sidebar-shell relative flex h-full flex-col">
            <Logo collapsed={collapsed} />

            <nav className="flex-1 overflow-y-auto px-3 pb-4">
                {NAV_GROUPS.map((group, gi) => (
                    <div key={group.heading} className={gi === 0 ? '' : 'mt-4'}>
                        {gi > 0 && (
                            <div className={`sidebar-rule mb-3 ${collapsed ? 'mx-2' : 'mx-1'}`} />
                        )}

                        {!collapsed && (
                            <div className="mb-2 px-2">
                                <div className="sidebar-heading text-[10px] font-bold uppercase tracking-[0.14em]">
                                    {group.heading}
                                </div>
                                <div className="sidebar-caption mt-0.5 text-[11px] font-medium leading-snug">
                                    {group.caption}
                                </div>
                            </div>
                        )}

                        {group.items.map(({ key, label, icon: Icon, badge }) => {
                            const active = isActive(key)
                            const count = badge ? badgeCounts[badge] || 0 : 0
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        navigate(key)
                                        onNavigate?.()
                                    }}
                                    title={collapsed ? label : undefined}
                                    className={`sidebar-item mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                                        active ? 'sidebar-item--active' : ''
                                    }`}
                                    style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                                >
                                    <span className="relative flex items-center">
                                        <Icon
                                            style={{ fontSize: 18, color: active ? 'var(--color-primary)' : undefined }}
                                        />
                                        {collapsed && count > 0 && (
                                            <span
                                                className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                                                style={{ background: 'var(--color-danger)' }}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </span>
                                    {!collapsed && <span className="flex-1 text-left">{label}</span>}
                                    {!collapsed && count > 0 && (
                                        <span
                                            className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white"
                                            style={{ background: 'var(--color-danger)' }}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                ))}
            </nav>

            {!collapsed && (
                <div className="sidebar-help m-3 rounded-2xl p-4">
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
