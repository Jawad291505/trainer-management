import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../services/api'

const ScheduleContext = createContext(null)

export function ScheduleProvider({ children }) {
    const [today, setToday] = useState([])
    const [upcoming, setUpcoming] = useState([])

    useEffect(() => {
        api.get('/schedule').then((res) => {
            setToday(res.today || [])
            setUpcoming(res.upcoming || [])
        }).catch(() => { })
    }, [])

    const addActivity = useCallback(async (activity) => {
        try {
            const created = await api.post('/schedule', activity)
            setToday((prev) => [...prev, created])
            return created
        } catch { /* */ }
    }, [])

    const removeActivity = useCallback(async (id) => {
        try {
            await api.delete(`/schedule/${id}`)
            setToday((prev) => prev.filter((a) => (a._id || a.id) !== id))
            setUpcoming((prev) => prev.filter((a) => (a._id || a.id) !== id))
        } catch { /* */ }
    }, [])

    const value = useMemo(() => ({ today, upcoming, addActivity, removeActivity }), [today, upcoming, addActivity, removeActivity])
    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    return ctx
}
