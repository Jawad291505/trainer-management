import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, getToken } from '../services/api'
import { getSocket } from '../services/socket'
import { useCorrections } from './CorrectionsContext'

// Safety net for missed socket events (sleeping laptop, dropped connection).
const POLL_MS = 60_000
const BASE_TITLE = document.title

const BadgesContext = createContext(null)

// "New stuff" counts for the sidebar tabs, the header bell and the browser tab
// title: unread messages, unread notifications and open client requests. Kept
// live by socket pings, with a slow poll + refresh-on-focus as a fallback.
export function BadgesProvider({ children }) {
    const [messages, setMessages] = useState(0)
    const [notifications, setNotifications] = useState(0)
    const { openCount: corrections, refreshCount: refreshCorrections } = useCorrections({ load: false })
    const refreshCorrectionsRef = useRef(refreshCorrections)
    refreshCorrectionsRef.current = refreshCorrections

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
        refreshCorrectionsRef.current()
    }, [refreshMessages, refreshNotifications])

    useEffect(() => {
        if (!getToken()) return
        refreshMessages()
        refreshNotifications()

        const s = getSocket()
        // A new client request always arrives with a notification, so that ping covers both.
        const onNotifications = () => {
            refreshNotifications()
            refreshCorrectionsRef.current()
        }
        s?.on('conversation:updated', refreshMessages)
        s?.on('notifications:changed', onNotifications)
        s?.io.on('reconnect', refresh)

        const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
        const timer = setInterval(onVisible, POLL_MS)
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            s?.off('conversation:updated', refreshMessages)
            s?.off('notifications:changed', onNotifications)
            s?.io.off('reconnect', refresh)
            clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [refresh, refreshMessages, refreshNotifications])

    const total = messages + notifications + corrections
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
