// Exercise plans carry NO numeric master-data calculation (no MET / calorie
// burn anywhere in the source apps). The only derived figure is completion
// percentage from the per-exercise `done` checkbox — mirrors the trainer's
// "Completed / Not completed / Completion %" view (plan.md section 27) and the
// client's per-day workout progress.
export function summarizeExercisePlan(plan) {
    const days = plan.days.map((day) => {
        const total = day.exercises.length
        const done = day.exercises.filter((e) => e.done).length
        return {
            id: String(day._id),
            day: day.day,
            focus: day.focus,
            exercises: day.exercises,
            total,
            done,
            completionPct: total ? Math.round((done / total) * 100) : 0,
        }
    })

    const total = days.reduce((s, d) => s + d.total, 0)
    const done = days.reduce((s, d) => s + d.done, 0)

    return {
        days,
        totalExercises: total,
        doneExercises: done,
        completionPct: total ? Math.round((done / total) * 100) : 0,
    }
}
