import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { todaySchedule } from '../services/mockData'

const ScheduleContext = createContext(null)

const STORAGE_KEY = 'fittrack.trainer.schedule'
export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A small week grid derived from the mock day schedule, used as the seed
// the first time the app runs (afterwards we read from localStorage).
const seedWeek = {
    Mon: [
        { id: 'W-Mon-1', time: '08:00', title: 'Strength', type: 'workout' },
        { id: 'W-Mon-2', time: '14:00', title: 'Diet review', type: 'meal' },
    ],
    Tue: [{ id: 'W-Tue-1', time: '10:00', title: 'Consultation', type: 'consultation' }],
    Wed: [
        { id: 'W-Wed-1', time: '09:00', title: 'Hypertrophy', type: 'workout' },
        { id: 'W-Wed-2', time: '17:00', title: 'Follow-up', type: 'followup' },
    ],
    Thu: [{ id: 'W-Thu-1', time: '11:00', title: 'Endurance', type: 'workout' }],
    Fri: [
        { id: 'W-Fri-1', time: '08:30', title: 'Legs', type: 'workout' },
        { id: 'W-Fri-2', time: '15:00', title: 'Check-in', type: 'consultation' },
    ],
    Sat: [{ id: 'W-Sat-1', time: '10:00', title: 'Mobility', type: 'workout' }],
    Sun: [],
}

const byTime = (a, b) => a.time.localeCompare(b.time)

function buildSeed() {
    return {
        today: [...todaySchedule],
        week: WEEK_DAYS.reduce((acc, d) => ({ ...acc, [d]: [...(seedWeek[d] || [])] }), {}),
    }
}

function readStored() {
    if (typeof window === 'undefined') return buildSeed()
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return buildSeed()
        const parsed = JSON.parse(raw)
        // Guard against a malformed / partial payload.
        if (!parsed || !Array.isArray(parsed.today) || !parsed.week) return buildSeed()
        WEEK_DAYS.forEach((d) => {
            if (!Array.isArray(parsed.week[d])) parsed.week[d] = []
        })
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

    // values: { day: 'today' | 'Mon'..'Sun', time, title, type, clientId, notes }
    const addActivity = useCallback((values) => {
        const entry = {
            id: `A-${Date.now()}`,
            time: values.time,
            title: values.title.trim(),
            type: values.type,
            clientId: values.clientId || null,
            notes: (values.notes || '').trim(),
        }
        setData((prev) => {
            if (values.day === 'today') {
                return { ...prev, today: [...prev.today, { ...entry, status: 'upcoming' }].sort(byTime) }
            }
            return {
                ...prev,
                week: { ...prev.week, [values.day]: [...prev.week[values.day], entry].sort(byTime) },
            }
        })
        return entry
    }, [])

    const removeActivity = useCallback((day, id) => {
        setData((prev) => {
            if (day === 'today') {
                return { ...prev, today: prev.today.filter((a) => a.id !== id) }
            }
            return { ...prev, week: { ...prev.week, [day]: prev.week[day].filter((a) => a.id !== id) } }
        })
    }, [])

    const resetSchedule = useCallback(() => setData(buildSeed()), [])

    const value = useMemo(
        () => ({ today: data.today, week: data.week, addActivity, removeActivity, resetSchedule }),
        [data, addActivity, removeActivity, resetSchedule],
    )

    return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
}

export function useSchedule() {
    const ctx = useContext(ScheduleContext)
    if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider')
    return ctx
}
