import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { foodSeed } from '../services/foodLibrary'
import { exerciseSeed } from '../services/exerciseLibrary'

// Admin-managed food & exercise libraries. Seeded from the shared root JSON
// (/data/*.json) and persisted to localStorage so admin edits survive reloads.
// This is the layer that, with a backend, would write straight to the database
// tables the trainer app reads from.

const LibraryContext = createContext(null)
const FOOD_KEY = 'fittrack.admin.foods'
const EX_KEY = 'fittrack.admin.exercises'

function readStored(key, seed) {
    if (typeof window === 'undefined') return [...seed]
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return [...seed]
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : [...seed]
    } catch {
        return [...seed]
    }
}

const slug = (name) =>
    name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

export function LibraryProvider({ children }) {
    const [foods, setFoods] = useState(() => readStored(FOOD_KEY, foodSeed))
    const [exercises, setExercises] = useState(() => readStored(EX_KEY, exerciseSeed))

    useEffect(() => {
        try {
            localStorage.setItem(FOOD_KEY, JSON.stringify(foods))
        } catch {
            /* storage unavailable */
        }
    }, [foods])

    useEffect(() => {
        try {
            localStorage.setItem(EX_KEY, JSON.stringify(exercises))
        } catch {
            /* storage unavailable */
        }
    }, [exercises])

    // ---- Foods ----
    const addFood = useCallback((food) => {
        setFoods((prev) => [{ ...food, id: `F-${slug(food.name)}-${Date.now()}`, source: 'admin' }, ...prev])
    }, [])
    const updateFood = useCallback((id, patch) => {
        setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    }, [])
    const removeFood = useCallback((id) => {
        setFoods((prev) => prev.filter((f) => f.id !== id))
    }, [])

    // ---- Exercises ----
    const addExercise = useCallback((ex) => {
        setExercises((prev) => [{ ...ex, id: `X-${slug(ex.name)}-${Date.now()}`, source: 'admin' }, ...prev])
    }, [])
    const updateExercise = useCallback((id, patch) => {
        setExercises((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    }, [])
    const removeExercise = useCallback((id) => {
        setExercises((prev) => prev.filter((x) => x.id !== id))
    }, [])

    const value = useMemo(
        () => ({
            foods,
            addFood,
            updateFood,
            removeFood,
            exercises,
            addExercise,
            updateExercise,
            removeExercise,
        }),
        [foods, addFood, updateFood, removeFood, exercises, addExercise, updateExercise, removeExercise],
    )

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    return ctx
}
