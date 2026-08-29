import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { schedule } from '../services/mockData'

const ScheduleContext = createContext(null)

const STORAGE_KEY = 'fittrack.client.schedule'

const byTime = (a, b) => a.time.localeCompare(b.time)

function buildSeed() {
    return {
        today: [...schedule.today],
        upcoming: [...schedule.upcoming],
    }
}

function readStored() {
    if (typeof window === 'undefined') return buildSeed()
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return buildSeed()
        const parsed = JSON.parse(raw)
        if (!parsed || !Array.isArray(parsed.today) || !Array.isArray(parsed.upcoming)) return buildSeed()
        return parsed
    } catch {
        return buildSeed()
    }
}

export function ScheduleProvider({ children }) {
    const [data, setData] = useState(readStored)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch {
            /* storage unavailable — keep working in-memory */
        }
    }, [data])

    // values: { when: 'today' | 'upcoming', time?, date?, title, type }
    const addActivity = useCallback((values) => {
        const title = values.title.trim()
        setData((prev) => {
            if (values.when === 'today') {
                const entry = { id: `A-${Date.now()}`, time: values.time, title, type: values.type, done: false }
                return { ...prev, today: [...prev.today, entry].sort(byTime) }
            }
            const entry = { id: `U-${Date.now()}`, date: values.date, title, type: values.type }
            return { ...prev, upcoming: [...prev.upcoming, entry] }
        })
    }, [])

    const removeActivity = useCallback((bucket, id) => {
        setData((prev) => ({ ...prev, [bucket]: prev[bucket].filter((a) => a.id !== id) }))
    }, [])

    const toggleDone = useCallback((id) => {
        setData((prev) => ({
            ...prev,
            today: prev.today.map((a) => (a.id === id ? { ...a, done: !a.done } : a)),
        }))
    }, [])

    const resetSchedule = useCallback(() => setData(buildSeed()), [])

    const value = useMemo(
        () => ({
            today: data.today,
            upcoming: data.upcoming,
            addActivity,
            removeActivity,
            toggleDone,
            resetSchedule,
        }),
        [data, addActivity, removeActivity, toggleDone, resetSchedule],
    )

    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    return ctx
}
