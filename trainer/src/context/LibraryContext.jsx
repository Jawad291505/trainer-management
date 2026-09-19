import { createContext, useContext, useCallback, useMemo, useState } from 'react'
import { api } from '../services/api'
import { useLazyResource, useEnsureLoaded, combineStatus } from '../hooks/useLazyResource'

const LibraryContext = createContext(null)

// Foods and exercises load independently and only when a page/modal that needs
// them mounts (see useLibrary's `need` argument) — the reference lists are
// cached briefly by the api client, so re-opening a page doesn't refetch them.
const LIBRARY_TTL = 60_000

export function LibraryProvider({ children }) {
    const [foods, setFoods] = useState([])
    const [exercises, setExercises] = useState([])

    const foodsRes = useLazyResource(useCallback(async () => {
        const f = await api.get('/foods', { ttl: LIBRARY_TTL })
        setFoods(f.items || [])
    }, []))
    const exercisesRes = useLazyResource(useCallback(async () => {
        const e = await api.get('/exercises', { ttl: LIBRARY_TTL })
        setExercises(e.items || [])
    }, []))

    const addFood = useCallback(async (food) => {
        const created = await api.post('/foods', food)
        setFoods((prev) => [created, ...prev])
        return created
    }, [])
    const updateFood = useCallback(async (id, patch) => {
        const updated = await api.patch(`/foods/${id}`, patch)
        setFoods((prev) => prev.map((f) => ((f._id || f.id) === id ? updated : f)))
    }, [])
    const removeFood = useCallback(async (id) => {
        await api.delete(`/foods/${id}`)
        setFoods((prev) => prev.filter((f) => (f._id || f.id) !== id))
    }, [])

    const addExercise = useCallback(async (ex) => {
        const created = await api.post('/exercises', ex)
        setExercises((prev) => [created, ...prev])
        return created
    }, [])
    const updateExercise = useCallback(async (id, patch) => {
        const updated = await api.patch(`/exercises/${id}`, patch)
        setExercises((prev) => prev.map((x) => ((x._id || x.id) === id ? updated : x)))
    }, [])
    const removeExercise = useCallback(async (id) => {
        await api.delete(`/exercises/${id}`)
        setExercises((prev) => prev.filter((x) => (x._id || x.id) !== id))
    }, [])

    const value = useMemo(() => ({
        foods, addFood, updateFood, removeFood,
        exercises, addExercise, updateExercise, removeExercise,
        resources: { foods: foodsRes, exercises: exercisesRes },
    }), [foods, addFood, updateFood, removeFood, exercises, addExercise, updateExercise, removeExercise, foodsRes, exercisesRes])

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

// useLibrary(['foods']) — declare which lists this component needs so only those
// are fetched. Returns the library plus `loading` / `error` / `reload` for them.
export function useLibrary(need = ['foods', 'exercises']) {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    const needed = need.map((k) => ctx.resources[k])
    useEnsureLoaded(...needed.map((r) => r.ensureLoaded))
    const { loading, error } = combineStatus(needed)
    const reload = useCallback(() => needed.forEach((r) => r.status === 'error' && r.reload()), [needed])
    return { ...ctx, loading, error, reload }
}
