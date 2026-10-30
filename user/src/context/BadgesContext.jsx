import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'
import { getSocket } from '../services/socket'
import { useCorrectionsBadge } from './CorrectionsContext'

// Safety net for missed socket events (sleeping laptop, dropped connection).
const POLL_MS = 60_000
const BASE_TITLE = document.title

const BadgesContext = createContext(null)

// "New stuff" counts for the sidebar / bottom-nav tabs, the header bell and the
// browser tab title: unread messages and unread notifications (plus the client's
// own open requests, shown on the My Requests tab). Kept live by socket pings,
// with a slow poll + refresh-on-focus as a fallback.
export function BadgesProvider({ children }) {
    const [messages, setMessages] = useState(0)
    const [notifications, setNotifications] = useState(0)
    const corrections = useCorrectionsBadge()

    const refreshMessages = useCallback(
        () => api.get('/conversations?summary=1').then((res) => setMessages(res.unreadCount || 0)).catch(() => { }),
        [],
    )
    const refreshNotifications = useCallback(
        () => api.get('/notifications?summary=1').then((res) => setNotifications(res.unreadCount || 0)).catch(() => { }),
        [],
    )
    const refresh = useCallback(() => {
        refreshMessages()
        refreshNotifications()
    }, [refreshMessages, refreshNotifications])

    useEffect(() => {
        if (!getToken()) return
        refresh()

        const s = getSocket()
        s?.on('conversation:updated', refreshMessages)
        s?.on('notifications:changed', refreshNotifications)
        s?.io.on('reconnect', refresh)

        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        const timer = setInterval(onVisible, POLL_MS)
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            s?.off('conversation:updated', refreshMessages)
            s?.off('notifications:changed', refreshNotifications)
            s?.io.off('reconnect', refresh)
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [refresh, refreshMessages, refreshNotifications])

    // Open requests are the client's own (waiting on the trainer), not news — kept out of the title.
    const total = messages + notifications
    useEffect(() => {
        document.title = total > 0 ? `(${formatBadge(total)}) ${BASE_TITLE}` : BASE_TITLE
        return () => { document.title = BASE_TITLE }
    }, [total])

    const value = useMemo(
        () => ({ messages, notifications, corrections, total, refresh, refreshNotifications }),
        [messages, notifications, corrections, total, refresh, refreshNotifications],
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
