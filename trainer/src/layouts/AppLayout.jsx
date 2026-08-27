import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Drawer } from 'antd'
import Sidebar from '../components/layout/Sidebar'
import Header from '../components/layout/Header'
import Breadcrumbs from '../components/layout/Breadcrumbs'

// Application shell: fixed sidebar on desktop, drawer on mobile,
// sticky header, breadcrumb + scrollable content region.
export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    // Close the mobile drawer when resizing up to desktop.
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) setMobileOpen(false)
        }
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const sidebarWidth = collapsed ? 84 : 264

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Desktop sidebar */}
            <aside
                className="hidden shrink-0 transition-all duration-300 lg:block"
                style={{ width: sidebarWidth }}
            >
                <Sidebar collapsed={collapsed} />
            </aside>

            {/* Mobile drawer */}
            <Drawer
                placement="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                width={264}
                closable={false}
                styles={{ body: { padding: 0, background: 'var(--sidebar-bg)' } }}
                rootClassName="lg:hidden"
            >
                <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </Drawer>

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
                <Header
                    collapsed={collapsed}
                    onToggle={() => setCollapsed((c) => !c)}
                    onOpenMobile={() => setMobileOpen(true)}
                />
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6 lg:px-8">
                        <Breadcrumbs />
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}
