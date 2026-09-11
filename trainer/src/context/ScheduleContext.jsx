import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const ScheduleContext = createContext(null)
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function ScheduleProvider({ children }) {
    const [today, setToday] = useState([])
    const [week, setWeek] = useState(Object.fromEntries(WEEK_DAYS.map((d) => [d, []])))

    useEffect(() => {
        if (!getToken()) return
        api.get('/schedule').then((res) => {
            setToday(res.today || [])
            setWeek(res.week || Object.fromEntries(WEEK_DAYS.map((d) => [d, []])))
        }).catch(() => { })
    }, [])

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

    const value = useMemo(() => ({ today, week, addActivity, removeActivity }), [today, week, addActivity, removeActivity])
    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    return ctx
}
