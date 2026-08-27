import { useMemo, useState } from 'react'
import { Progress, Input } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  WarningFilled,
  CoffeeOutlined,
  FireOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import { dietPlan } from '../../../services/mockData'

export default function MyDiet() {
  // Per-item completion, keyed by `${mealId}:${index}`.
  const [checked, setChecked] = useState(() => {
    const seed = {}
    dietPlan.meals.forEach((m) => {
      const preset = m.taskId === 'T1' || m.taskId === 'T4'
      m.items.forEach((_, i) => {
        seed[`${m.id}:${i}`] = preset
      })
    })
    return seed
  })

  // Cheat state per meal: { [mealId]: { on: boolean, note: string } }
  const [cheats, setCheats] = useState({})

  const isCheat = (mealId) => !!cheats[mealId]?.on

  const toggleItem = (mealId, idx) => {
    if (isCheat(mealId)) return
    setChecked((prev) => ({ ...prev, [`${mealId}:${idx}`]: !prev[`${mealId}:${idx}`] }))
  }

  const toggleCheat = (mealId) =>
    setCheats((prev) => ({
      ...prev,
      [mealId]: { on: !prev[mealId]?.on, note: prev[mealId]?.note || '' },
    }))

  const setCheatNote = (mealId, note) =>
    setCheats((prev) => ({ ...prev, [mealId]: { ...prev[mealId], note } }))

  const mealProgress = (meal) => {
    const done = meal.items.filter((_, i) => checked[`${meal.id}:${i}`]).length
    return { done, total: meal.items.length, pct: Math.round((done / meal.items.length) * 100) }
  }

  const summary = useMemo(() => {
    const totalItems = dietPlan.meals.reduce((s, m) => s + m.items.length, 0)
    let doneItems = 0
    let cheatMeals = 0
    dietPlan.meals.forEach((m) => {
      if (isCheat(m.id)) {
        cheatMeals += 1
        return // cheat meals count as not adhered
      }
      m.items.forEach((_, i) => {
        if (checked[`${m.id}:${i}`]) doneItems += 1
      })
    })
    const onPlanMeals = dietPlan.meals.length - cheatMeals
    return {
      adherence: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
      cheatMeals,
      onPlanMeals,
      totalMeals: dietPlan.meals.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, cheats])

  return (
    <div>
      <PageHeader title="My Diet Plan" subtitle={dietPlan.title} />

      {/* Overall summary */}
      <div className="app-card mb-4 p-5">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-text-secondary">Today's adherence</span>
          <span className="font-bold text-text-primary">{summary.adherence}%</span>
        </div>
        <Progress
          percent={summary.adherence}
          strokeColor={{ '0%': 'var(--color-primary)', '100%': 'var(--color-success)' }}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            <CheckOutlined /> {summary.onPlanMeals} on plan
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: summary.cheatMeals ? 'var(--color-warning-soft)' : 'var(--color-surface-secondary)',
              color: summary.cheatMeals ? 'var(--color-warning)' : 'var(--color-text-muted)',
            }}
          >
            <FireOutlined /> {summary.cheatMeals} cheat {summary.cheatMeals === 1 ? 'meal' : 'meals'}
          </span>
        </div>
        {summary.cheatMeals === 0 && summary.adherence === 100 && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            Perfect day — every meal on plan! 🎉
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {dietPlan.meals.map((meal) => {
          const p = mealProgress(meal)
          const cheat = isCheat(meal.id)
          const complete = !cheat && p.done === p.total
          return (
            <div
              key={meal.id}
              className="app-card p-5 transition-all"
              style={cheat ? { borderColor: 'var(--color-warning)' } : undefined}
            >
              {/* Meal header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: cheat ? 'var(--color-warning)' : complete ? 'var(--color-success)' : 'var(--color-primary-soft)',
                      color: cheat || complete ? '#fff' : 'var(--color-primary)',
                    }}
                  >
                    {cheat ? <FireOutlined /> : complete ? <CheckOutlined /> : <CoffeeOutlined />}
                  </span>
                  <div>
                    <div className="font-bold text-text-primary">{meal.name}</div>
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <ClockCircleOutlined /> {meal.time}
                    </div>
                  </div>
                </div>
                <span className="text-sm font-bold" style={{ color: cheat ? 'var(--color-warning)' : complete ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                  {cheat ? 'Cheat' : `${p.done}/${p.total}`}
                </span>
              </div>

              {/* Per-meal progress (hidden when cheat) */}
              {!cheat && (
                <div className="mt-3">
                  <Progress percent={p.pct} showInfo={false} strokeColor={complete ? 'var(--color-success)' : 'var(--color-primary)'} size="small" />
                </div>
              )}

              {/* Item checkboxes (dimmed when cheat) */}
              <div className={`mt-3 flex flex-col gap-2 ${cheat ? 'pointer-events-none opacity-40' : ''}`}>
                {meal.items.map((it, i) => {
                  const on = checked[`${meal.id}:${i}`]
                  return (
                    <button
                      key={i}
                      onClick={() => toggleItem(meal.id, i)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all"
                      style={{
                        background: on ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)',
                        border: `1px solid ${on ? 'transparent' : 'var(--color-border)'}`,
                      }}
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
                        style={{
                          borderColor: on ? 'var(--color-success)' : 'var(--color-border-strong)',
                          background: on ? 'var(--color-success)' : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {on && <CheckOutlined style={{ fontSize: 11 }} />}
                      </span>
                      <span className={`flex-1 font-medium ${on ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                        {it.food}
                      </span>
                      <span className="text-text-muted">{it.qty}</span>
                    </button>
                  )
                })}
              </div>

              {/* Cheat note */}
              {cheat && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>
                    <WarningFilled /> Marked as a cheat meal
                  </div>
                  <Input
                    value={cheats[meal.id]?.note || ''}
                    onChange={(e) => setCheatNote(meal.id, e.target.value)}
                    placeholder="Optional: what did you have instead?"
                    variant="filled"
                  />
                </div>
              )}

              {meal.notes && !cheat && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                  {meal.notes}
                </div>
              )}

              {/* Cheat toggle */}
              <button
                onClick={() => toggleCheat(meal.id)}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: cheat ? 'var(--color-text-muted)' : 'var(--color-warning)' }}
              >
                <FireOutlined /> {cheat ? 'Back on plan' : 'Mark as cheat meal'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
