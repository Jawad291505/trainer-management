import { useEffect, useMemo, useState, useCallback } from 'react'
import { Progress, Input, Alert, Button, Modal, App } from 'antd'
import {
  ClockCircleOutlined,
  CheckOutlined,
  WarningFilled,
  CoffeeOutlined,
  FireOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import RequestCorrection from '../components/RequestCorrection'
import GlycemicBadge from '../components/GlycemicBadge'
import PageSpin from '../../../components/common/PageSpin'
import { useAuth } from '../../../context/AuthContext'
import { api } from '../../../services/api'
import { getFood } from '../../../services/foodLibrary'
import { computeNutrition, formatQty, glMealLevel } from '../../../utils/nutrition'

// Use the pre-computed nutrition from the API response, or fall back to local resolution
function resolveItem(it) {
  // If the API already pre-computed this item (from serializeDietPlan), use it
  if (it.name && it.qtyLabel && it.cal !== undefined) {
    return { label: it.name, qtyLabel: it.qtyLabel, cal: it.cal, protein: it.protein, carbs: it.carbs, fat: it.fat, gi: it.gi, gl: it.gl }
  }
  // Fallback: resolve locally
  const food = getFood(it.foodId || it.foodCode)
  if (!food) {
    return { label: it.food || it.name || 'Food', qtyLabel: `${it.qty ?? ''}`, cal: 0, protein: 0, carbs: 0, fat: 0, gi: 0, gl: 0 }
  }
  const n = computeNutrition(food, it.qty)
  return { label: food.name, qtyLabel: formatQty(food, it.qty), ...n }
}

export default function MyDiet() {
  const { message } = App.useApp()
  const { client } = useAuth()
  const [dietPlan, setDietPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cheats, setCheats] = useState({}) // { [mealId]: { on, note, items } }
  const [cheatModal, setCheatModal] = useState(null) // mealId being edited
  const [cheatNote, setCheatNote] = useState('')
  const [cheatItems, setCheatItems] = useState([''])

  useEffect(() => {
    if (!client) return
    Promise.all([
      api.get(`/clients/${client._id || client.id}/diet-plan`),
      api.get('/progress/daily').catch(() => null),
    ]).then(([plan, daily]) => {
      setDietPlan(plan)
      // Hydrate cheats from today's daily log
      if (daily?.cheats?.length) {
        const loaded = {}
        daily.cheats.forEach((c) => {
          loaded[String(c.mealId)] = { on: true, note: c.note || '', items: c.items || [] }
        })
        setCheats(loaded)
      }
    }).catch(() => { }).finally(() => setLoading(false))
  }, [client])

  // Precompute resolved items + per-meal macro/GL totals once.
  const meals = useMemo(
    () =>
      (dietPlan?.meals || []).map((m) => {
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
    [dietPlan],
  )

  // Per-item completion, keyed by `${mealId}:${index}`.
  const [checked, setChecked] = useState({})

  // Hydrate checked state from daily log meal tasks
  useEffect(() => {
    if (!dietPlan) return
    api.get('/progress/daily').then((daily) => {
      if (!daily?.tasks) return
      const mealTasks = {}
      daily.tasks.filter((t) => t.type === 'meal').forEach((t) => {
        mealTasks[String(t.mealId)] = t.done
      })
      // If a meal task is done, mark all its items as checked
      const seed = {}
      meals.forEach((m) => {
        const mealDone = mealTasks[String(m._id || m.id)] || false
        m.resolved.forEach((_, i) => {
          seed[`${m.id}:${i}`] = mealDone
        })
      })
      setChecked(seed)
    }).catch(() => { })
  }, [dietPlan, meals])

  // Cheat state per meal: { [mealId]: { on, note, items } }
  const isCheat = (mealId) => !!cheats[mealId]?.on

  const openCheatModal = (mealId, mealName) => {
    const existing = cheats[mealId]
    setCheatNote(existing?.note || '')
    setCheatItems(existing?.items?.length ? [...existing.items] : [''])
    setCheatModal({ id: mealId, name: mealName })
  }

  const saveCheat = async () => {
    if (!cheatModal) return
    const mealId = cheatModal.id
    const items = cheatItems.filter((s) => s.trim())
    try {
      await api.post('/progress/daily/cheat', {
        mealId,
        mealName: cheatModal.name,
        note: cheatNote,
        items,
      })
      setCheats((prev) => ({ ...prev, [mealId]: { on: true, note: cheatNote, items } }))
      message.success('Cheat meal logged')
    } catch (err) {
      message.error(err.message || 'Failed to save')
    }
    setCheatModal(null)
  }

  const revertCheat = async (mealId) => {
    try {
      await api.delete(`/progress/daily/cheat/${mealId}`)
      setCheats((prev) => { const n = { ...prev }; delete n[mealId]; return n })
      message.success('Back on plan')
    } catch (err) {
      message.error(err.message || 'Failed to revert')
    }
  }

  const toggleItem = async (mealId, idx) => {
    if (isCheat(mealId)) return
    const key = `${mealId}:${idx}`
    const newVal = !checked[key]
    const next = { ...checked, [key]: newVal }
    setChecked(next)

    // Check if all items in this meal are now done
    const meal = meals.find((m) => (m._id || m.id) === mealId || m.id === mealId)
    if (!meal) return
    const allDone = meal.resolved.every((_, i) => next[`${mealId}:${i}`])
    const wasDone = meal.resolved.every((_, i) => i === idx ? checked[key] : checked[`${mealId}:${i}`])

    // Only call backend when meal completion state changes (all done or was all done)
    if (allDone !== wasDone) {
      try {
        await api.patch('/progress/daily', { taskKey: `meal:${mealId}`, done: allDone })
      } catch { /* */ }
    }
  }

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

  if (loading) return <PageSpin />

  return (
    <div>
      <PageHeader title="My Diet Plan" subtitle={dietPlan?.title || 'No diet plan assigned'}>
        <RequestCorrection area="diet" items={(dietPlan?.meals || []).map((m) => `${m.name} — ${m.time}`)} />
      </PageHeader>

      {/* Trainer attribution — makes the plan feel assigned, not generic */}
      <div className="mb-4 flex items-center gap-2 text-xs text-text-muted">
        <span>
          Assigned by <span className="font-semibold text-text-secondary">your trainer</span>
        </span>
        <span className="h-1 w-1 rounded-full" style={{ background: 'var(--color-border-strong)' }} />
        <span>Updated {dietPlan?.updatedAt ? new Date(dietPlan.updatedAt).toLocaleDateString('en-CA') : '—'}</span>
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

              {/* Cheat details */}
              {cheat && (
                <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--color-warning-soft)' }}>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>
                    <WarningFilled /> Cheat meal logged
                  </div>
                  {cheats[meal.id]?.note && (
                    <div className="text-sm text-text-secondary">{cheats[meal.id].note}</div>
                  )}
                  {cheats[meal.id]?.items?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {cheats[meal.id].items.map((item, i) => (
                        <span key={i} className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => openCheatModal(meal.id, meal.name)}
                    className="mt-2 text-xs font-semibold"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    Edit what you ate
                  </button>
                </div>
              )}

              {meal.notes && !cheat && (
                <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                  {meal.notes}
                </div>
              )}

              {/* Cheat toggle */}
              <button
                onClick={() => cheat ? revertCheat(meal.id) : openCheatModal(meal.id, meal.name)}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: cheat ? 'var(--color-text-muted)' : 'var(--color-warning)' }}
              >
                <FireOutlined /> {cheat ? 'Back on plan' : 'Mark as cheat meal'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Cheat meal modal */}
      <Modal
        title={`Cheat meal — ${cheatModal?.name || ''}`}
        open={!!cheatModal}
        onCancel={() => setCheatModal(null)}
        onOk={saveCheat}
        okText="Save cheat meal"
        centered
        width={480}
      >
        <p className="mt-0 mb-3 text-sm text-text-secondary">
          Let your trainer know what you had instead. This helps them adjust your plan.
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-text-secondary">What did you eat?</label>
          {cheatItems.map((item, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <Input
                value={item}
                onChange={(e) => {
                  const next = [...cheatItems]
                  next[i] = e.target.value
                  setCheatItems(next)
                }}
                placeholder={`e.g. ${i === 0 ? 'Pizza' : 'Soda'}`}
              />
              {cheatItems.length > 1 && (
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setCheatItems((prev) => prev.filter((_, j) => j !== i))}
                />
              )}
            </div>
          ))}
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setCheatItems((prev) => [...prev, ''])}
          >
            Add item
          </Button>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-secondary">Note (optional)</label>
          <Input.TextArea
            rows={2}
            value={cheatNote}
            onChange={(e) => setCheatNote(e.target.value)}
            placeholder="e.g. Birthday dinner, couldn't resist the cake"
          />
        </div>
      </Modal>
    </div>
  )
}
