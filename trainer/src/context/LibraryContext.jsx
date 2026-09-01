import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { foodLibrary } from '../services/foodLibrary'
import { exerciseLibrary } from '../services/exerciseLibrary'
import { currentTrainer } from '../services/mockData'

// Holds the trainer's own custom foods and exercises on top of the predefined
// (admin) libraries. Persisted to localStorage; ready to swap for API calls.

const LibraryContext = createContext(null)
const FOOD_KEY = 'fittrack.trainer.customFoods'
const EX_KEY = 'fittrack.trainer.customExercises'

function readStored(key) {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(key)
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function LibraryProvider({ children }) {
    const [customFoods, setCustomFoods] = useState(() => readStored(FOOD_KEY))
    const [customExercises, setCustomExercises] = useState(() => readStored(EX_KEY))

    useEffect(() => {
        try {
            localStorage.setItem(FOOD_KEY, JSON.stringify(customFoods))
        } catch {
            /* storage unavailable */
        }
    }, [customFoods])

    useEffect(() => {
        try {
            localStorage.setItem(EX_KEY, JSON.stringify(customExercises))
        } catch {
            /* storage unavailable */
        }
    }, [customExercises])

    // ---- Foods ----
    const addFood = useCallback((food) => {
        const entry = { ...food, id: `F-custom-${Date.now()}`, source: 'trainer', ownerId: currentTrainer.id }
        setCustomFoods((prev) => [entry, ...prev])
        return entry
    }, [])

    const removeFood = useCallback((id) => {
        setCustomFoods((prev) => prev.filter((f) => f.id !== id))
    }, [])

    // Predefined foods first, then the trainer's own.
    const foods = useMemo(() => [...foodLibrary, ...customFoods], [customFoods])

    // ---- Exercises ----
    const addExercise = useCallback((ex) => {
        const entry = { ...ex, id: `X-custom-${Date.now()}`, source: 'trainer', ownerId: currentTrainer.id }
        setCustomExercises((prev) => [entry, ...prev])
        return entry
    }, [])

    const updateExercise = useCallback((id, patch) => {
        setCustomExercises((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    }, [])

    const removeExercise = useCallback((id) => {
        setCustomExercises((prev) => prev.filter((x) => x.id !== id))
    }, [])

    // Predefined exercises first, then the trainer's own.
    const exercises = useMemo(() => [...exerciseLibrary, ...customExercises], [customExercises])

    const value = useMemo(
        () => ({
            foods,
            customFoods,
            addFood,
            removeFood,
            exercises,
            customExercises,
            addExercise,
            updateExercise,
            removeExercise,
        }),
        [foods, customFoods, addFood, removeFood, exercises, customExercises, addExercise, updateExercise, removeExercise],
    )

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    return ctx
}
