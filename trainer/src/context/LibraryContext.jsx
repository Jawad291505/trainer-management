import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { api, getToken } from '../services/api'

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
    const [foods, setFoods] = useState([])
    const [exercises, setExercises] = useState([])

    useEffect(() => {
        if (!getToken()) return
        Promise.all([api.get('/foods'), api.get('/exercises')]).then(([f, e]) => {
            setFoods(f.items || [])
            setExercises(e.items || [])
        }).catch(() => { })
    }, [])

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
    }), [foods, addFood, updateFood, removeFood, exercises, addExercise, updateExercise, removeExercise])

    return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export function useLibrary() {
    const ctx = useContext(LibraryContext)
    if (!ctx) throw new Error('useLibrary must be used within LibraryProvider')
    return ctx
}
