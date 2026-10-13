import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useLazyResource, useEnsureLoaded, combineStatus } from '../hooks/useLazyResource'

// Admin-managed food & exercise libraries + diet- and exercise-plan templates.
// All CRUD goes through the backend API.
//
// Each list loads independently and only when a page that needs it mounts (see
// useLibrary's `need` argument) — the dashboard, users, payments, … never
// download the food/exercise libraries. The reference lists are cached briefly
// by the api client, so revisiting a library page doesn't refetch them.

const LibraryContext = createContext(null)

const LIBRARY_TTL = 60_000

// Map backend Food doc to the flat shape the UI expects
export function normalize(f) {
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

export function normalizeEx(e) {
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

export function LibraryProvider({ children }) {
    const [foods, setFoods] = useState([])
    const [exercises, setExercises] = useState([])
    const [dietPlans, setDietPlans] = useState([])
    const [exercisePlans, setExercisePlans] = useState([])

    const foodsRes = useLazyResource(useCallback(async () => {
        const f = await api.get('/foods', { ttl: LIBRARY_TTL })
        setFoods((f.items || []).map(normalize))
    }, []))
    const exercisesRes = useLazyResource(useCallback(async () => {
        const e = await api.get('/exercises', { ttl: LIBRARY_TTL })
        setExercises((e.items || []).map(normalizeEx))
    }, []))
    const dietPlansRes = useLazyResource(useCallback(async () => {
        // withNutrition: items come back with their food name + macros, which the
        // template cards and editor display.
        const d = await api.get('/diet-plan-templates?withNutrition=1', { ttl: LIBRARY_TTL })
        setDietPlans(d.items || [])
    }, []))
    const exercisePlansRes = useLazyResource(useCallback(async () => {
        const d = await api.get('/exercise-plan-templates', { ttl: LIBRARY_TTL })
        setExercisePlans(d.items || [])
    }, []))

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

    // ---- Exercise-plan templates ----
    const addExercisePlan = useCallback(async (plan) => {
        const created = await api.post('/exercise-plan-templates', plan)
        setExercisePlans((prev) => [...prev, created])
        return created._id || created.id
    }, [])

    const updateExercisePlan = useCallback(async (id, patch) => {
        const updated = await api.patch(`/exercise-plan-templates/${id}`, patch)
        setExercisePlans((prev) => prev.map((p) => ((p._id || p.id) === id ? updated : p)))
    }, [])

    const removeExercisePlan = useCallback(async (id) => {
        await api.delete(`/exercise-plan-templates/${id}`)
        setExercisePlans((prev) => prev.filter((p) => (p._id || p.id) !== id))
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
            exercisePlans,
            addExercisePlan,
            updateExercisePlan,
            removeExercisePlan,
            resources: { foods: foodsRes, exercises: exercisesRes, dietPlans: dietPlansRes, exercisePlans: exercisePlansRes },
        }),
        [
            foods, addFood, updateFood, removeFood,
            exercises, addExercise, updateExercise, removeExercise,
            dietPlans, addDietPlan, updateDietPlan, removeDietPlan,
            exercisePlans, addExercisePlan, updateExercisePlan, removeExercisePlan,
            foodsRes, exercisesRes, dietPlansRes, exercisePlansRes,
        ],
    )

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

// useLibrary(['foods']) — declare which lists this page needs so only those are
// fetched: 'foods' | 'exercises' | 'dietPlans' | 'exercisePlans'. Returns the library plus
// `loading` / `error` / `reload` for the lists requested.
export function useLibrary(need = ['foods', 'exercises', 'dietPlans']) {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    const needed = need.map((k) => ctx.resources[k])
    useEnsureLoaded(...needed.map((r) => r.ensureLoaded))
    const { loading, error } = combineStatus(needed)
    const reload = useCallback(() => needed.forEach((r) => r.status === 'error' && r.reload()), [needed])
    return { ...ctx, loading, error, reload }
}
