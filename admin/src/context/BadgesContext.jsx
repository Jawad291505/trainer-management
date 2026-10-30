import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'
import { useAuth } from './AuthContext'

// The admin portal has no socket connection, so badges poll (and refresh when
// the browser tab regains focus).
const POLL_MS = 30_000
const BASE_TITLE = document.title

const BadgesContext = createContext(null)

// "New stuff" counts for the sidebar tabs, the header bell and the browser tab
// title: unread notifications, plus (admin only) payment proofs awaiting review.
export function BadgesProvider({ children }) {
    const { user } = useAuth()
    const isAdmin = user?.role === 'admin'
    const [notifications, setNotifications] = useState(0)
    const [approvals, setApprovals] = useState(0)

    const refreshNotifications = useCallback(
        () => api.get('/notifications?summary=1').then((res) => setNotifications(res.unreadCount || 0)).catch(() => { }),
        [],
    )
    const refreshApprovals = useCallback(() => {
        if (!isAdmin) return Promise.resolve()
        return api.get('/member-payments?summary=1').then((res) => setApprovals(res.pendingCount || 0)).catch(() => { })
    }, [isAdmin])
    const refresh = useCallback(() => {
        refreshNotifications()
        refreshApprovals()
    }, [refreshNotifications, refreshApprovals])

    useEffect(() => {
        if (!getToken()) return
        refresh()
        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        const timer = setInterval(onVisible, POLL_MS)
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [refresh])

    const total = notifications + approvals
    useEffect(() => {
        document.title = total > 0 ? `(${formatBadge(total)}) ${BASE_TITLE}` : BASE_TITLE
        return () => { document.title = BASE_TITLE }
    }, [total])

    const value = useMemo(
        () => ({ notifications, approvals, total, refresh, refreshNotifications, refreshApprovals }),
        [notifications, approvals, total, refresh, refreshNotifications, refreshApprovals],
    )
    return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
}

export function useBadges() {
    const ctx = useContext(BadgesContext)
    if (!ctx) throw new Error('useBadges must be used within BadgesProvider')
    return ctx
}

// Badge label: 1…99, then "99+".
export const formatBadge = (n) => (n > 99 ? '99+' : String(n))
