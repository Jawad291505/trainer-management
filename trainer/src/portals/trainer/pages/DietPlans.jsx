import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select, Button, Modal, Form, Input, InputNumber, TimePicker, Tag, App, Alert, Spin, Segmented, Tabs, Typography } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    ClockCircleOutlined,
    ScheduleOutlined,
    SaveOutlined,
    SendOutlined,
    WarningOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import ModalTitle from '../../../components/common/ModalTitle'
import SectionError from '../../../components/feedback/SectionError'
import { useClientList } from '../../../hooks/useClientList'
import { api } from '../../../services/api'
import { useLibrary } from '../../../context/LibraryContext'
import {
    computeNutrition,
    glItemLevel,
    glMealLevel,
    mealGL,
    glycemicMeta,
} from '../../../utils/nutrition'
import { formatMealTime } from '../../../utils/time'
import { WEEKDAYS, MEAL_TYPES } from '../../../constants/dietPlan'
import FoodModal from '../components/FoodModal'
import GlycemicBadge from '../components/GlycemicBadge'

let daySeq = 100
let mealSeq = 100
let optionSeq = 100

const emptyDay = (day) => ({ id: `D${daySeq++}`, day, meals: [] })

// One option's food list: an "Add food" action + item table, scoped to a
// single option so several options can coexist under the same meal.
function OptionPane({ option, onAddFood, onChangeQty, onRemoveFood, foods }) {
    const gl = mealGL(option.items)
    const level = glMealLevel(gl)
    return (
        <div>
            <div className="flex items-center justify-between gap-2">
                {option.items.length > 0 ? (
                    <GlycemicBadge type="Option GL" value={gl} level={level} />
                ) : <span className="text-xs text-text-muted">No foods yet</span>}
                <Button size="small" icon={<PlusOutlined />} onClick={onAddFood}>Add food</Button>
            </div>

            {level !== 'low' && option.items.length > 0 && (
                <Alert
                    className="mt-3"
                    type={level === 'high' ? 'error' : 'warning'}
                    showIcon
                    icon={<WarningOutlined />}
                    message={
                        level === 'high'
                            ? `High glycemic load (${gl}). Consider lower-GI carbs or smaller portions.`
                            : `Moderate glycemic load (${gl}). Keep an eye on carb portions.`
                    }
                />
            )}

            {option.items.length > 0 ? (
                <div className="mt-3 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                    <table className="w-full text-sm">
                        <thead>
                            <tr style={{ background: 'var(--color-surface-secondary)' }}>
                                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Food</th>
                                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Qty</th>
                                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Cal</th>
                                <th className="hidden px-3 py-2 text-right font-semibold text-text-secondary sm:table-cell">P/C/F</th>
                                <th className="px-3 py-2 text-right font-semibold text-text-secondary">GI/GL</th>
                                <th className="w-10 px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {option.items.map((it, idx) => {
                                const food = foods.find((f) => f.id === it.foodId)
                                const step = food ? food.step : 1
                                return (
                                    <tr key={idx} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                        <td className="px-3 py-2 font-medium text-text-primary">{it.food}</td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-1.5">
                                                <InputNumber
                                                    size="small"
                                                    min={step}
                                                    step={step}
                                                    value={it.qty}
                                                    onChange={(v) => onChangeQty(idx, v || step)}
                                                    style={{ width: 78 }}
                                                />
                                                <span className="text-xs text-text-muted">{it.unit === 'count' ? '' : it.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-text-secondary">{it.cal}</td>
                                        <td className="hidden px-3 py-2 text-right text-text-muted sm:table-cell">{it.protein}/{it.carbs}/{it.fat}</td>
                                        <td className="px-3 py-2 text-right">
                                            <GlycemicBadge type="GL" value={it.gl || 0} level={glItemLevel(it.gl || 0)} />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemoveFood(idx)} />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div
                    className="mt-3 rounded-xl border border-dashed py-6 text-center text-sm text-text-muted"
                    style={{ borderColor: 'var(--color-border-strong)' }}
                >
                    No foods yet — add one above.
                </div>
            )}
        </div>
    )
}

export default function DietPlans() {
    const { message, modal } = App.useApp()
    const { foods, loading: foodsLoading, error: foodsError, reload: reloadFoods } = useLibrary(['foods'])
    // ?client=<id> pre-selects the client (used by the Requests page's "Open plan").
    const [searchParams] = useSearchParams()
    const [clientId, setClientId] = useState(() => searchParams.get('client'))
    const { clients: clientList, loading: clientsLoading, error: clientsError, reload: reloadClients } = useClientList()
    const [dayMode, setDayMode] = useState('same') // 'same' | 'custom'
    const [days, setDays] = useState([])
    const [activeDayId, setActiveDayId] = useState(null)
    const [activeOptionByMeal, setActiveOptionByMeal] = useState({}) // mealId -> optionId
    const [planId, setPlanId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [planError, setPlanError] = useState(null)
    const [planTick, setPlanTick] = useState(0)
    const [templates, setTemplates] = useState([])

    const activeDay = useMemo(() => days.find((d) => d.id === activeDayId) || null, [days, activeDayId])
    const meals = activeDay?.meals || []

    // Apply an updater to the active day's meals array.
    const setMeals = (updater) => {
        setDays((prev) =>
            prev.map((d) => (d.id === activeDayId ? { ...d, meals: typeof updater === 'function' ? updater(d.meals) : updater } : d)),
        )
    }

    useEffect(() => {
        api.get('/diet-plan-templates', { ttl: 60_000 }).then((res) => {
            setTemplates(res.items || [])
        }).catch(() => { })
    }, [])

    // Default to the first client once the roster arrives (or if the ?client= one isn't theirs).
    useEffect(() => {
        if (clientsLoading) return
        if (clientList.length > 0) setClientId((cur) => (clientList.some((c) => c.id === cur) ? cur : clientList[0].id))
        else setLoading(false) // no clients — nothing to load a plan for
    }, [clientsLoading, clientList])

    // Build local day state from an API plan's `days`. Falls back to wrapping
    // a legacy flat `items` array into a single "Option 1" if a plan predates
    // the meal-options feature and hasn't gone through the migration yet.
    const loadDaysFromPlan = (plan) =>
        (plan.days || []).map((d, di) => ({
            id: d.id || d._id || `D${di}`,
            day: d.day,
            meals: (d.meals || []).map((m, mi) => {
                const mealId = m.id || m._id || `M${mi}`
                const rawOptions = m.options && m.options.length ? m.options : [{ label: 'Option 1', items: m.items || [] }]
                const options = rawOptions.map((o, oi) => ({
                    id: o.id || o._id || `${mealId}-O${oi}`,
                    label: o.label || `Option ${oi + 1}`,
                    items: (o.items || []).map((it) => ({
                        foodId: it.foodId || it.food,
                        foodCode: it.foodCode,
                        food: it.name || it.food_name || '',
                        qty: it.qty,
                        unit: it.unit || 'g',
                        cal: it.cal || 0,
                        protein: Math.round((it.protein || 0) * 10) / 10,
                        carbs: Math.round((it.carbs || 0) * 10) / 10,
                        fat: Math.round((it.fat || 0) * 10) / 10,
                        gl: it.gl || 0,
                        gi: it.gi || 0,
                    })),
                }))
                return { id: mealId, name: m.name, time: m.time || '', notes: m.notes || '', options }
            }),
        }))

    // Custom mode always shows all 7 weekdays, in order — fill in any missing
    // one (a fresh plan, or one that predates this feature) with an empty day.
    const ensureAllWeekdays = (loadedDays) =>
        WEEKDAYS.map((day) => loadedDays.find((d) => d.day.toLowerCase() === day.toLowerCase()) || emptyDay(day))

    // Apply a freshly-fetched plan (or a brand-new client with none yet) to
    // local state — shared by the client-load effect and applyTemplate().
    const hydratePlan = (full) => {
        if (!full) {
            const day = emptyDay('Everyday')
            setDayMode('same')
            setDays([day])
            setActiveDayId(day.id)
            setPlanId(null)
            setTemplateName('')
            return
        }
        setPlanId(full._id || full.id)
        setTemplateName(full.title || '')
        const mode = full.dayMode === 'custom' ? 'custom' : 'same'
        setDayMode(mode)
        let loaded = loadDaysFromPlan(full)
        if (mode === 'custom') loaded = ensureAllWeekdays(loaded)
        else if (!loaded.length) loaded = [emptyDay('Everyday')]
        setDays(loaded)
        setActiveDayId(loaded[0]?.id || null)
        setActiveOptionByMeal({})
    }

    // Load existing diet plan for selected client
    useEffect(() => {
        if (!clientId) return
        setLoading(true)
        setPlanError(null)
        setTemplateId(undefined)
        api.get(`/diet-plans?client=${clientId}&summary=1`).then(async (res) => {
            const plans = res.items || []
            const plan = plans.find((p) => p.status === 'draft') || plans[0]
            if (!plan) { hydratePlan(null); return }
            // Fetch the full plan with computed nutrition
            const full = await api.get(`/diet-plans/${plan._id || plan.id}`)
            hydratePlan(full)
        }).catch((err) => setPlanError(err)).finally(() => setLoading(false))
    }, [clientId, planTick])
    const [templateId, setTemplateId] = useState(undefined)
    const [templateName, setTemplateName] = useState('')
    const [mealModal, setMealModal] = useState(false)
    const [foodModal, setFoodModal] = useState(null) // { mealId, optionId }
    const [mealForm] = Form.useForm()

    const openMealModal = () => setMealModal(true)

    // Apply an admin diet-plan template via API — populates a single
    // "Everyday" day; the trainer can split it into weekdays afterward.
    const applyTemplate = async (id) => {
        if (!clientId) { message.warning('Select a client first'); return }
        setTemplateId(id)
        try {
            const plan = await api.post('/diet-plans/from-template', { clientId, templateId: id })
            hydratePlan(plan)
            const tpl = templates.find((p) => (p._id || p.id) === id)
            setTemplateName(tpl?.name || 'Template')
            message.success(`Loaded "${tpl?.name || 'template'}" — review and customise before publishing`)
        } catch (err) {
            message.error(err.message || 'Failed to load template')
        }
    }

    const clearTemplate = () => {
        setTemplateId(undefined)
        setTemplateName('')
    }

    // Same-for-all-days <-> separate-per-day. Switching to "separate" copies
    // the current shared plan into all 7 weekdays as a starting point (no data
    // lost). Switching back to "same" is destructive for the other days, so it
    // asks for confirmation and keeps whichever day is currently active.
    const switchToSameForAllDays = () => {
        if (dayMode === 'same') return
        const source = activeDay || days[0]
        const finish = () => {
            const day = { id: `D${daySeq++}`, day: 'Everyday', meals: source?.meals || [] }
            setDayMode('same')
            setDays([day])
            setActiveDayId(day.id)
            setActiveOptionByMeal({})
        }
        modal.confirm({
            title: 'Use one plan for every day?',
            content: `This keeps ${source?.day || 'the current day'}'s meals as the plan for all 7 days, and discards the other days' meals.`,
            okText: 'Use for all days',
            onOk: finish,
        })
    }

    const switchToSeparateDays = () => {
        if (dayMode === 'custom') return
        const sourceMeals = days[0]?.meals || []
        const cloneMeals = () => JSON.parse(JSON.stringify(sourceMeals))
        const newDays = WEEKDAYS.map((day) => ({ id: `D${daySeq++}`, day, meals: cloneMeals() }))
        setDayMode('custom')
        setDays(newDays)
        setActiveDayId(newDays[0].id)
        setActiveOptionByMeal({})
    }

    const addMeal = async () => {
        const v = await mealForm.validateFields()
        setMeals((prev) => [
            ...prev,
            {
                id: `M${mealSeq++}`,
                name: v.name,
                time: v.time ? v.time.format('HH:mm') : '',
                notes: v.notes || '',
                options: [{ id: `O${optionSeq++}`, label: 'Option 1', items: [] }],
            },
        ])
        mealForm.resetFields()
        setMealModal(false)
        message.success('Meal added')
    }

    const removeMeal = (id) => {
        setMeals((prev) => prev.filter((m) => m.id !== id))
        message.success('Meal removed')
    }

    // Meal-option management: add/remove/rename an option (Breakfast Option 1/2/3…).
    const addOption = (mealId) => {
        const newOptId = `O${optionSeq++}`
        setMeals((prev) =>
            prev.map((m) =>
                m.id === mealId
                    ? { ...m, options: [...m.options, { id: newOptId, label: `Option ${m.options.length + 1}`, items: [] }] }
                    : m,
            ),
        )
        setActiveOptionByMeal((a) => ({ ...a, [mealId]: newOptId }))
    }

    const removeOption = (mealId, optionId) => {
        const meal = meals.find((m) => m.id === mealId)
        if (!meal || meal.options.length <= 1) {
            message.warning('A meal needs at least one option')
            return
        }
        const remaining = meal.options.filter((o) => o.id !== optionId)
        setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, options: remaining } : m)))
        setActiveOptionByMeal((a) => (a[mealId] === optionId ? { ...a, [mealId]: remaining[0]?.id } : a))
    }

    const renameOption = (mealId, optionId, label) => {
        setMeals((prev) =>
            prev.map((m) =>
                m.id !== mealId ? m : { ...m, options: m.options.map((o) => (o.id === optionId ? { ...o, label } : o)) },
            ),
        )
    }

    const addFoodToMeal = (item) => {
        if (!foodModal) return
        const { mealId, optionId } = foodModal
        setMeals((prev) =>
            prev.map((m) =>
                m.id !== mealId
                    ? m
                    : { ...m, options: m.options.map((o) => (o.id !== optionId ? o : { ...o, items: [...o.items, item] })) },
            ),
        )
        setFoodModal(null)
        message.success('Food added')
    }

    // Changing a food's quantity re-derives its macros + GL automatically.
    const changeQty = (mealId, optionId, idx, qty) => {
        setMeals((prev) =>
            prev.map((m) => {
                if (m.id !== mealId) return m
                return {
                    ...m,
                    options: m.options.map((o) => {
                        if (o.id !== optionId) return o
                        const items = o.items.map((it, i) => {
                            if (i !== idx) return it
                            const food = foods.find((f) => f.id === it.foodId)
                            if (!food) return { ...it, qty }
                            const n = computeNutrition(food, qty)
                            return { ...it, qty, ...n }
                        })
                        return { ...o, items }
                    }),
                }
            }),
        )
    }

    const removeFood = (mealId, optionId, idx) => {
        setMeals((prev) =>
            prev.map((m) =>
                m.id !== mealId
                    ? m
                    : {
                        ...m,
                        options: m.options.map((o) => (o.id !== optionId ? o : { ...o, items: o.items.filter((_, i) => i !== idx) })),
                    },
            ),
        )
    }

    // Build the days payload for the API
    const buildDaysPayload = () =>
        days.map((d) => ({
            day: d.day,
            meals: d.meals.map((m) => ({
                name: m.name,
                time: m.time,
                notes: m.notes || '',
                options: m.options.map((o) => ({
                    label: o.label,
                    items: o.items.map((it) => ({
                        foodCode: it.foodCode,
                        food_name: it.food,
                        qty: it.qty,
                        unit: it.unit,
                    })),
                })),
            })),
        }))

    const saveDraft = async () => {
        if (!clientId) { message.warning('Select a client first'); return }
        if (days.length === 0) { message.warning('Add at least one day'); return }
        setSaving(true)
        try {
            if (planId) {
                await api.patch(`/diet-plans/${planId}`, { days: buildDaysPayload(), dayMode })
            } else {
                const plan = await api.post('/diet-plans', {
                    clientId,
                    title: templateName || 'Custom Diet Plan',
                    days: buildDaysPayload(),
                    dayMode,
                })
                setPlanId(plan._id || plan.id)
            }
            message.success('Draft saved')
        } catch (err) {
            message.error(err.message || 'Failed to save draft')
        } finally {
            setSaving(false)
        }
    }

    const publishPlan = async () => {
        if (!clientId) { message.warning('Select a client first'); return }
        if (days.length === 0) { message.warning('Add at least one day'); return }
        setPublishing(true)
        try {
            let id = planId
            if (!id) {
                const plan = await api.post('/diet-plans', {
                    clientId,
                    title: templateName || 'Custom Diet Plan',
                    days: buildDaysPayload(),
                    dayMode,
                })
                id = plan._id || plan.id
                setPlanId(id)
            } else {
                await api.patch(`/diet-plans/${id}`, { days: buildDaysPayload(), dayMode })
            }
            await api.post(`/diet-plans/${id}/publish`)
            message.success('Plan published to client')
        } catch (err) {
            message.error(err.message || 'Failed to publish plan')
        } finally {
            setPublishing(false)
        }
    }

    // Day totals reflect each meal's first (default) option — the same
    // fallback the backend uses when a client hasn't picked one yet.
    const dayTotals = meals.reduce(
        (acc, m) => {
            (m.options[0]?.items || []).forEach((it) => {
                acc.cal += it.cal
                acc.protein += it.protein
                acc.carbs += it.carbs
                acc.fat += it.fat
                acc.gl += it.gl || 0
            })
            return acc
        },
        { cal: 0, protein: 0, carbs: 0, fat: 0, gl: 0 },
    )
    dayTotals.protein = Math.round(dayTotals.protein)
    dayTotals.carbs = Math.round(dayTotals.carbs)
    dayTotals.fat = Math.round(dayTotals.fat)
    dayTotals.gl = Math.round(dayTotals.gl * 10) / 10

    return (
        <div>
            <PageHeader title="Diet Plans" subtitle="Build and publish customized meal plans.">
                <Button icon={<SaveOutlined />} loading={saving} onClick={saveDraft}>Save draft</Button>
                <Button type="primary" icon={<SendOutlined />} loading={publishing} onClick={publishPlan}>Publish</Button>
            </PageHeader>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-sm font-semibold text-text-secondary">Client</span>
                <Select
                    value={clientId}
                    onChange={setClientId}
                    style={{ width: 240 }}
                    options={clientList.map((c) => ({ value: c.id, label: c.name }))}
                />
                <Segmented
                    className="sm:ml-auto"
                    value={dayMode}
                    onChange={(v) => (v === 'same' ? switchToSameForAllDays() : switchToSeparateDays())}
                    options={[
                        { label: 'Same for all days', value: 'same' },
                        { label: 'Separate for each day', value: 'custom' },
                    ]}
                />
            </div>

            {dayMode === 'custom' && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Segmented
                        value={activeDayId}
                        onChange={setActiveDayId}
                        options={days.map((d) => ({ label: d.day, value: d.id }))}
                    />
                    <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                    >
                        {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={openMealModal}>
                        Add meal
                    </Button>
                </div>
            )}

            {dayMode === 'same' && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-text-primary">Every day</span>
                    <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                    >
                        {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                    </span>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={openMealModal}>
                        Add meal
                    </Button>
                </div>
            )}

            {/* Start from an admin template */}
            <div className="app-card mb-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-text-primary">Start from a template</div>
                        <div className="text-xs text-text-muted">
                            Copies the template's meals, foods and quantities. Customise before publishing.
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <Select
                            value={templateId}
                            onChange={applyTemplate}
                            placeholder="Select a template…"
                            style={{ width: 240 }}
                            options={templates.map((p) => ({ value: p._id || p.id, label: `${p.name}${p.goal ? ` · ${p.goal}` : ''}` }))}
                        />
                        {templateName && <Button type="text" onClick={clearTemplate}>Clear</Button>}
                    </div>
                </div>
                {templateName && (
                    <div className="mt-3">
                        <Tag bordered={false} color="blue" style={{ borderRadius: 999 }}>
                            Populated from “{templateName}” — customise freely
                        </Tag>
                    </div>
                )}
            </div>

            {/* Daily totals bar */}
            <div className="app-card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
                {[
                    { label: 'Calories', value: `${dayTotals.cal}` },
                    { label: 'Protein', value: `${dayTotals.protein}g` },
                    { label: 'Carbs', value: `${dayTotals.carbs}g` },
                    { label: 'Fats', value: `${dayTotals.fat}g` },
                    { label: 'Glycemic Load', value: `${dayTotals.gl}`, level: glMealLevel(dayTotals.gl) },
                ].map((t) => (
                    <div key={t.label} className="text-center">
                        <div
                            className="text-lg font-extrabold"
                            style={{ color: t.level ? glycemicMeta[t.level].color : 'var(--color-text-primary)' }}
                        >
                            {t.value}
                        </div>
                        <div className="text-[11px] text-text-muted">{t.label}</div>
                    </div>
                ))}
            </div>

            {loading || (foodsLoading && !clientsError) ? (
                <div className="flex justify-center py-16"><Spin size="large" /></div>
            ) : clientsError ? (
                <div className="app-card"><SectionError title="Couldn't load your clients" error={clientsError} onRetry={reloadClients} /></div>
            ) : planError ? (
                <div className="app-card"><SectionError title="Couldn't load this client's diet plan" error={planError} onRetry={() => setPlanTick((t) => t + 1)} /></div>
            ) : foodsError ? (
                <div className="app-card"><SectionError title="Couldn't load the food library" error={foodsError} onRetry={reloadFoods} /></div>
            ) : meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No meals yet"
                        description={`Start building ${dayMode === 'same' ? "every day's" : `${activeDay?.day || 'this day'}'s`} plan by adding a meal.`}
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openMealModal}>Add meal</Button>}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {meals.map((m) => {
                        const activeOptionId = activeOptionByMeal[m.id] || m.options[0]?.id
                        return (
                            <div key={m.id} className="app-card p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-text-primary">{m.name}</div>
                                        <div className="flex items-center gap-1 text-xs text-text-muted"><ClockCircleOutlined /> {formatMealTime(m.time)}</div>
                                    </div>
                                    <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeMeal(m.id)} />
                                </div>

                                {m.options.length > 1 && (
                                    <div className="mt-2 text-xs text-text-muted">
                                        Multiple options — the client picks which one to follow.
                                    </div>
                                )}

                                <Tabs
                                    className="mt-2 diet-option-tabs"
                                    type="editable-card"
                                    hideAdd={false}
                                    activeKey={activeOptionId}
                                    onChange={(key) => setActiveOptionByMeal((a) => ({ ...a, [m.id]: key }))}
                                    onEdit={(targetKey, action) => {
                                        if (action === 'add') addOption(m.id)
                                        else removeOption(m.id, targetKey)
                                    }}
                                    items={m.options.map((o) => ({
                                        key: o.id,
                                        closable: m.options.length > 1,
                                        label: (
                                            <Typography.Text
                                                editable={{ onChange: (val) => val.trim() && renameOption(m.id, o.id, val.trim()) }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {o.label}
                                            </Typography.Text>
                                        ),
                                        children: (
                                            <OptionPane
                                                option={o}
                                                foods={foods}
                                                onAddFood={() => setFoodModal({ mealId: m.id, optionId: o.id })}
                                                onChangeQty={(idx, qty) => changeQty(m.id, o.id, idx, qty)}
                                                onRemoveFood={(idx) => removeFood(m.id, o.id, idx)}
                                            />
                                        ),
                                    }))}
                                />

                                {m.notes && (
                                    <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                        {m.notes}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal
                title={<ModalTitle icon={<ScheduleOutlined />} title="Add meal" subtitle="A slot in the day — you'll add foods to it next" />}
                open={mealModal}
                onCancel={() => setMealModal(false)}
                onOk={addMeal}
                okText="Add meal"
                okButtonProps={{ icon: <PlusOutlined /> }}
                centered
            >
                <Form form={mealForm} layout="vertical" className="mt-1">
                    <Form.Item name="name" label="Meal name" rules={[{ required: true, message: 'Select a meal name' }]}>
                        <Select placeholder="Select a meal" options={MEAL_TYPES.map((t) => ({ value: t, label: t }))} />
                    </Form.Item>
                    <Form.Item name="time" label="Time" rules={[{ required: true, message: 'Select a time' }]}>
                        <TimePicker use12Hours format="h:mm A" minuteStep={5} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Optional guidance" />
                    </Form.Item>
                </Form>
            </Modal>

            <FoodModal open={!!foodModal} onCancel={() => setFoodModal(null)} onAdd={addFoodToMeal} />
        </div>
    )
}
