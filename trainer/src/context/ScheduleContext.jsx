import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useLazyResource, useEnsureLoaded } from '../hooks/useLazyResource'

const ScheduleContext = createContext(null)
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const emptyWeek = () => Object.fromEntries(WEEK_DAYS.map((d) => [d, []]))

// Fetched the first time the Schedule page mounts — not on every page load.
export function ScheduleProvider({ children }) {
    const [today, setToday] = useState([])
    const [week, setWeek] = useState(emptyWeek)

    const { status, error, ensureLoaded, reload } = useLazyResource(useCallback(async () => {
        const res = await api.get('/schedule')
        setToday(res.today || [])
        setWeek(res.week || emptyWeek())
    }, []))

    const addActivity = useCallback(async (activity) => {
        try {
            const payload = {
                title: activity.title,
                type: activity.type,
                scope: activity.day,          // 'today' | 'Mon'..'Sun'
                time: activity.time,
                notes: activity.notes,
                client: activity.clientId,     // optional
            }
            const created = await api.post('/schedule', payload)
            if (activity.day === 'today') {
                setToday((prev) => [...prev, created])
            } else {
                setWeek((prev) => ({ ...prev, [activity.day]: [...(prev[activity.day] || []), created] }))
            }
            return created
        } catch { /* */ }
    }, [])

    const removeActivity = useCallback(async (id) => {
        try {
            await api.delete(`/schedule/${id}`)
            setToday((prev) => prev.filter((a) => (a._id || a.id) !== id))
            setWeek((prev) => {
                const next = {}
                for (const [d, items] of Object.entries(prev)) {
                    next[d] = items.filter((a) => (a._id || a.id) !== id)
                }
                return next
            })
        } catch { /* */ }
    }, [])

    const loading = status === 'idle' || status === 'loading'
    const value = useMemo(
        () => ({ today, week, addActivity, removeActivity, loading, error, reload, ensureLoaded }),
        [today, week, addActivity, removeActivity, loading, error, reload, ensureLoaded],
    )
    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    useEnsureLoaded(ctx.ensureLoaded)
    return ctx
}
