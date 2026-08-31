import { useMemo, useState } from 'react'
import { Progress, Input, Alert } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  WarningFilled,
  CoffeeOutlined,
  FireOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import GlycemicBadge from '../components/GlycemicBadge'
import { dietPlan, trainer } from '../../../services/mockData'
import { getFood } from '../../../services/foodLibrary'
import { computeNutrition, formatQty, glMealLevel } from '../../../utils/nutrition'

// Resolve a plan item against the shared food library and derive its live
// macros + GI/GL from the chosen quantity.
function resolveItem(it) {
  const food = getFood(it.foodId)
  if (!food) {
    return { label: it.food || 'Food', qtyLabel: `${it.qty ?? ''}`, cal: 0, protein: 0, carbs: 0, fat: 0, gi: 0, gl: 0 }
  }
  const n = computeNutrition(food, it.qty)
  return { label: food.name, qtyLabel: formatQty(food, it.qty), ...n }
}

export default function MyDiet() {
  // Precompute resolved items + per-meal macro/GL totals once.
  const meals = useMemo(
    () =>
      dietPlan.meals.map((m) => {
        const items = m.items.map(resolveItem)
        const totals = items.reduce(
          (acc, it) => ({
            cal: acc.cal + it.cal,
            protein: Math.round((acc.protein + it.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + it.carbs) * 10) / 10,
            fat: Math.round((acc.fat + it.fat) * 10) / 10,
            gl: Math.round((acc.gl + it.gl) * 10) / 10,
          }),
          { cal: 0, protein: 0, carbs: 0, fat: 0, gl: 0 },
        )
        return { ...m, resolved: items, totals }
      }),
    [],
  )

  // Per-item completion, keyed by `${mealId}:${index}`.
  const [checked, setChecked] = useState(() => {
    const seed = {}
    meals.forEach((m) => {
      const preset = m.taskId === 'T1' || m.taskId === 'T4'
      m.resolved.forEach((_, i) => {
        seed[`${m.id}:${i}`] = preset
      })
    })
    return seed
  })

  // Cheat state per meal: { [mealId]: { on, note } }
  const [cheats, setCheats] = useState({})
  const isCheat = (mealId) => !!cheats[mealId]?.on

  const toggleItem = (mealId, idx) => {
    if (isCheat(mealId)) return
    setChecked((prev) => ({ ...prev, [`${mealId}:${idx}`]: !prev[`${mealId}:${idx}`] }))
  }

  const toggleCheat = (mealId) =>
    setCheats((prev) => ({ ...prev, [mealId]: { on: !prev[mealId]?.on, note: prev[mealId]?.note || '' } }))

  const setCheatNote = (mealId, note) =>
    setCheats((prev) => ({ ...prev, [mealId]: { ...prev[mealId], note } }))

  const mealProgress = (meal) => {
    const done = meal.resolved.filter((_, i) => checked[`${meal.id}:${i}`]).length
    return { done, total: meal.resolved.length, pct: Math.round((done / meal.resolved.length) * 100) }
  }

  const summary = useMemo(() => {
    const totalItems = meals.reduce((s, m) => s + m.resolved.length, 0)
    let doneItems = 0
    let cheatMeals = 0
    meals.forEach((m) => {
      if (isCheat(m.id)) {
        cheatMeals += 1
        return
      }
      m.resolved.forEach((_, i) => {
        if (checked[`${m.id}:${i}`]) doneItems += 1
      })
    })
    return {
      adherence: totalItems ? Math.round((doneItems / totalItems) * 100) : 0,
      cheatMeals,
      onPlanMeals: meals.length - cheatMeals,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked, cheats, meals])

  // Daily macro targets (non-cheat meals only).
  const dayTotals = useMemo(() => {
    return meals.reduce(
      (acc, m) => {
        if (isCheat(m.id)) return acc
        acc.cal += m.totals.cal
        acc.protein += m.totals.protein
        acc.carbs += m.totals.carbs
        acc.fat += m.totals.fat
        return acc
      },
      { cal: 0, protein: 0, carbs: 0, fat: 0 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cheats, meals])

  return (
    <div>
      <PageHeader title="My Diet Plan" subtitle={dietPlan.title}>
        <RequestCorrection area="diet" items={dietPlan.meals.map((m) => `${m.name} — ${m.time}`)} />
      </PageHeader>

      {/* Trainer attribution — makes the plan feel assigned, not generic */}
      <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
        <span>
          Assigned by <span className="font-semibold text-text-secondary">{trainer.name}</span>
        </span>
        <span className="h-1 w-1 rounded-full" style={{ background: 'var(--color-border-strong)' }} />
        <span>Updated {dietPlan.updatedAt}</span>
      </div>

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

        {/* Planned daily macros */}
        <div className="mt-4 grid grid-cols-4 gap-2 border-t pt-4 text-center" style={{ borderColor: 'var(--color-border)' }}>
          {[
            { label: 'Calories', value: dayTotals.cal },
            { label: 'Protein', value: `${Math.round(dayTotals.protein)}g` },
            { label: 'Carbs', value: `${Math.round(dayTotals.carbs)}g` },
            { label: 'Fats', value: `${Math.round(dayTotals.fat)}g` },
          ].map((t) => (
            <div key={t.label}>
              <div className="text-base font-extrabold text-text-primary">{t.value}</div>
              <div className="text-[11px] text-text-muted">{t.label}</div>
            </div>
          ))}
        </div>

        {summary.cheatMeals === 0 && summary.adherence === 100 && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs font-medium" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
            Perfect day — every meal on plan! 🎉
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {meals.map((meal) => {
          const p = mealProgress(meal)
          const cheat = isCheat(meal.id)
          const complete = !cheat && p.done === p.total
          const glLevel = glMealLevel(meal.totals.gl)
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
                <div className="flex items-center gap-2">
                  {!cheat && meal.resolved.length > 0 && (
                    <span className="hidden text-xs font-semibold text-text-muted sm:inline">{meal.totals.cal} kcal</span>
                  )}
                  {!cheat && meal.totals.gl > 0 && (
                    <GlycemicBadge type="Meal GL" value={meal.totals.gl} level={glLevel} />
                  )}
                  <span className="text-sm font-bold" style={{ color: cheat ? 'var(--color-warning)' : complete ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                    {cheat ? 'Cheat' : `${p.done}/${p.total}`}
                  </span>
                </div>
              </div>

              {/* Meal GI/GL alert */}
              {!cheat && glLevel !== 'low' && (
                <Alert
                  className="mt-3"
                  type={glLevel === 'high' ? 'error' : 'warning'}
                  showIcon
                  message={
                    glLevel === 'high'
                      ? `High glycemic load (${meal.totals.gl}). Pair with protein or a walk after.`
                      : `Moderate glycemic load (${meal.totals.gl}).`
                  }
                />
              )}

              {/* Per-meal progress (hidden when cheat) */}
              {!cheat && (
                <div className="mt-3">
                  <Progress percent={p.pct} showInfo={false} strokeColor={complete ? 'var(--color-success)' : 'var(--color-primary)'} size="small" />
                </div>
              )}

              {/* Item checkboxes (dimmed when cheat) */}
              <div className={`mt-3 flex flex-col gap-2 ${cheat ? 'pointer-events-none opacity-40' : ''}`}>
                {meal.resolved.map((it, i) => {
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
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${on ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                          {it.label}
                        </div>
                        <div className="text-[11px] text-text-muted">
                          {it.cal} kcal · P{it.protein} C{it.carbs} F{it.fat}
                        </div>
                      </div>
                      <span className="shrink-0 text-text-muted">{it.qtyLabel}</span>
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
