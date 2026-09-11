import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

// Admin-managed food & exercise libraries + diet-plan templates.
// All CRUD goes through the backend API.

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
    const [foods, setFoods] = useState([])
    const [exercises, setExercises] = useState([])
    const [dietPlans, setDietPlans] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            if (!getToken()) { setLoading(false); return }
            try {
                const [f, e, d] = await Promise.all([
                    api.get('/foods'),
                    api.get('/exercises'),
                    api.get('/diet-plan-templates'),
                ])
                setFoods((f.items || []).map(normalize))
                setExercises((e.items || []).map(normalizeEx))
                setDietPlans(d.items || [])
            } catch {
                // will be empty if not authed yet
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    // Map backend Food doc to the flat shape the UI expects
    function normalize(f) {
        return {
            id: f._id || f.id,
            code: f.code,
            name: f.name,
            category: f.category,
            unit: f.unit || 'g',
            base: f.base,
            step: f.step,
            defaultQty: f.defaultQty,
            serving: f.serving,
            gi: f.gi,
            gl: f.gl,
            cal: f.cal,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
            fiber: f.fiber,
            source: f.source,
        }
    }

    function normalizeEx(e) {
        return {
            id: e._id || e.id,
            code: e.code,
            name: e.name,
            category: e.category,
            technique: e.technique,
            defaultSets: e.defaultSets,
            defaultReps: e.defaultReps,
            defaultRest: e.defaultRest,
            youtube: e.youtube,
            notes: e.notes,
            equipment: e.equipment,
            target: e.target,
            source: e.source,
        }
    }

    // ---- Foods ----
    const addFood = useCallback(async (food) => {
        const created = await api.post('/foods', food)
        setFoods((prev) => [normalize(created), ...prev])
    }, [])

    const updateFood = useCallback(async (id, patch) => {
        const updated = await api.patch(`/foods/${id}`, patch)
        setFoods((prev) => prev.map((f) => (f.id === id ? normalize(updated) : f)))
    }, [])

    const removeFood = useCallback(async (id) => {
        await api.delete(`/foods/${id}`)
        setFoods((prev) => prev.filter((f) => f.id !== id))
    }, [])

    // ---- Exercises ----
    const addExercise = useCallback(async (ex) => {
        const created = await api.post('/exercises', ex)
        setExercises((prev) => [normalizeEx(created), ...prev])
    }, [])

    const updateExercise = useCallback(async (id, patch) => {
        const updated = await api.patch(`/exercises/${id}`, patch)
        setExercises((prev) => prev.map((x) => (x.id === id ? normalizeEx(updated) : x)))
    }, [])

    const removeExercise = useCallback(async (id) => {
        await api.delete(`/exercises/${id}`)
        setExercises((prev) => prev.filter((x) => x.id !== id))
    }, [])

    // ---- Diet-plan templates ----
    const addDietPlan = useCallback(async (plan) => {
        const created = await api.post('/diet-plan-templates', plan)
        setDietPlans((prev) => [...prev, created])
        return created._id || created.id
    }, [])

    const updateDietPlan = useCallback(async (id, patch) => {
        const updated = await api.patch(`/diet-plan-templates/${id}`, patch)
        setDietPlans((prev) => prev.map((p) => ((p._id || p.id) === id ? updated : p)))
    }, [])

    const removeDietPlan = useCallback(async (id) => {
        await api.delete(`/diet-plan-templates/${id}`)
        setDietPlans((prev) => prev.filter((p) => (p._id || p.id) !== id))
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
            dietPlans,
            addDietPlan,
            updateDietPlan,
            removeDietPlan,
            loading,
        }),
        [
            foods, addFood, updateFood, removeFood,
            exercises, addExercise, updateExercise, removeExercise,
            dietPlans, addDietPlan, updateDietPlan, removeDietPlan,
            loading,
        ],
    )

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    return ctx
}
