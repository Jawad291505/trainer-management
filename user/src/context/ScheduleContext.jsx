import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useLazyResource, useEnsureLoaded } from '../hooks/useLazyResource'

const ScheduleContext = createContext(null)

// Fetched the first time the Schedule page mounts — not on every page load.
export function ScheduleProvider({ children }) {
    const [today, setToday] = useState([])
    const [upcoming, setUpcoming] = useState([])

    const { status, error, ensureLoaded, reload } = useLazyResource(useCallback(async () => {
        const res = await api.get('/schedule')
        setToday(res.today || [])
        setUpcoming(res.upcoming || [])
    }, []))

    const addActivity = useCallback(async (activity) => {
        try {
            const payload = {
                title: activity.title,
                type: activity.type,
                scope: activity.when === 'upcoming' ? 'upcoming' : 'today',
                time: activity.time,
                date: activity.date,
            }
            const created = await api.post('/schedule', payload)
            if (payload.scope === 'today') {
                setToday((prev) => [...prev, created])
            } else {
                setUpcoming((prev) => [...prev, created])
            }
            return created
        } catch { /* */ }
    }, [])

    const removeActivity = useCallback(async (where, id) => {
        try {
            await api.delete(`/schedule/${id}`)
            if (where === 'today') {
                setToday((prev) => prev.filter((a) => (a._id || a.id) !== id))
            } else {
                setUpcoming((prev) => prev.filter((a) => (a._id || a.id) !== id))
            }
        } catch { /* */ }
    }, [])

    const toggleDone = useCallback(async (id) => {
        const item = today.find((a) => (a._id || a.id) === id)
        const newDone = item ? !item.done : true
        try {
            await api.patch(`/schedule/${id}`, { done: newDone })
        } catch { /* */ }
        setToday((prev) => prev.map((a) => ((a._id || a.id) === id ? { ...a, done: newDone } : a)))
    }, [today])

    const loading = status === 'idle' || status === 'loading'
    const value = useMemo(
        () => ({ today, upcoming, addActivity, removeActivity, toggleDone, loading, error, reload, ensureLoaded }),
        [today, upcoming, addActivity, removeActivity, toggleDone, loading, error, reload, ensureLoaded],
    )
    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    useEnsureLoaded(ctx.ensureLoaded)
    return ctx
}
