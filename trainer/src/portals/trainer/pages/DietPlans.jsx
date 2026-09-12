import { useEffect, useMemo, useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, Tag, App, Alert, Spin, Segmented } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    ClockCircleOutlined,
    ScheduleOutlined,
    SaveOutlined,
    SendOutlined,
    WarningOutlined,
    CalendarOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import ModalTitle from '../../../components/common/ModalTitle'
import { api } from '../../../services/api'
import { useLibrary } from '../../../context/LibraryContext'
import {
    computeNutrition,
    glItemLevel,
    glMealLevel,
    mealGL,
    glycemicMeta,
} from '../../../utils/nutrition'
import FoodModal from '../components/FoodModal'
import GlycemicBadge from '../components/GlycemicBadge'

let daySeq = 100
let mealSeq = 100

export default function DietPlans() {
    const { message } = App.useApp()
    const { foods } = useLibrary()
    const [clientId, setClientId] = useState(null)
    const [clientList, setClientList] = useState([])
    const [days, setDays] = useState([])
    const [activeDayId, setActiveDayId] = useState(null)
    const [planId, setPlanId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [loading, setLoading] = useState(true)
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
        api.get('/clients').then((res) => {
            const items = res.items || []
            setClientList(items)
            if (items.length > 0) setClientId(items[0].id)
        }).catch(() => { })
        api.get('/diet-plan-templates').then((res) => {
            setTemplates(res.items || [])
        }).catch(() => { })
    }, [])

    // Build local day state from an API plan's `days`.
    const loadDaysFromPlan = (plan) =>
        (plan.days || []).map((d, di) => ({
            id: d.id || d._id || `D${di}`,
            day: d.day,
            meals: (d.meals || []).map((m, mi) => ({
                id: m.id || m._id || `M${mi}`,
                name: m.name,
                time: m.time || '',
                notes: m.notes || '',
                items: (m.items || []).map((it) => ({
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
            })),
        }))

    // Load existing diet plan for selected client
    useEffect(() => {
        if (!clientId) return
        setLoading(true)
        setPlanId(null)
        setDays([])
        setActiveDayId(null)
        setTemplateName('')
        setTemplateId(undefined)
        api.get(`/diet-plans?client=${clientId}`).then(async (res) => {
            const plans = res.items || []
            const plan = plans.find((p) => p.status === 'draft') || plans[0]
            if (!plan) return
            // Fetch the full plan with computed nutrition
            const full = await api.get(`/diet-plans/${plan._id || plan.id}`)
            setPlanId(full._id || full.id)
            setTemplateName(full.title || '')
            const loaded = loadDaysFromPlan(full)
            setDays(loaded)
            setActiveDayId(loaded[0]?.id || null)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [clientId])
    const [templateId, setTemplateId] = useState(undefined)
    const [templateName, setTemplateName] = useState('')
    const [dayModal, setDayModal] = useState(false)
    const [mealModal, setMealModal] = useState(false)
    const [foodModal, setFoodModal] = useState(null) // mealId
    const [dayForm] = Form.useForm()
    const [mealForm] = Form.useForm()

    const openMealModal = () => setMealModal(true)

    const addDay = async () => {
        const v = await dayForm.validateFields()
        const id = `D${daySeq++}`
        setDays((prev) => [...prev, { id, day: v.day, meals: [] }])
        setActiveDayId(id)
        dayForm.resetFields()
        setDayModal(false)
        message.success('Day added')
    }

    const removeDay = (id) => {
        setDays((prev) => {
            const next = prev.filter((d) => d.id !== id)
            if (activeDayId === id) setActiveDayId(next[0]?.id || null)
            return next
        })
        message.success('Day removed')
    }

    // Apply an admin diet-plan template via API — populates a single
    // "Everyday" day; the trainer can split it into weekdays afterward.
    const applyTemplate = async (id) => {
        if (!clientId) { message.warning('Select a client first'); return }
        setTemplateId(id)
        try {
            const plan = await api.post('/diet-plans/from-template', { clientId, templateId: id })
            setPlanId(plan._id || plan.id)
            const loaded = loadDaysFromPlan(plan)
            setDays(loaded)
            setActiveDayId(loaded[0]?.id || null)
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

    const addMeal = async () => {
        const v = await mealForm.validateFields()
        setMeals((prev) => [...prev, { id: `M${mealSeq++}`, name: v.name, time: v.time, items: [], notes: v.notes || '' }])
        mealForm.resetFields()
        setMealModal(false)
        message.success('Meal added')
    }

    const removeMeal = (id) => {
        setMeals((prev) => prev.filter((m) => m.id !== id))
        message.success('Meal removed')
    }

    const addFoodToMeal = (item) => {
        setMeals((prev) => prev.map((m) => (m.id === foodModal ? { ...m, items: [...m.items, item] } : m)))
        setFoodModal(null)
        message.success('Food added')
    }

    // Changing a food's quantity re-derives its macros + GL automatically.
    const changeQty = (mealId, idx, qty) => {
        setMeals((prev) =>
            prev.map((m) => {
                if (m.id !== mealId) return m
                const items = m.items.map((it, i) => {
                    if (i !== idx) return it
                    const food = foods.find((f) => f.id === it.foodId)
                    if (!food) return { ...it, qty }
                    const n = computeNutrition(food, qty)
                    return { ...it, qty, ...n }
                })
                return { ...m, items }
            }),
        )
    }

    const removeFood = (mealId, idx) => {
        setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== idx) } : m)))
    }

    // Build the days payload for the API
    const buildDaysPayload = () =>
        days.map((d) => ({
            day: d.day,
            meals: d.meals.map((m) => ({
                name: m.name,
                time: m.time,
                notes: m.notes || '',
                items: m.items.map((it) => ({
                    foodCode: it.foodCode,
                    food_name: it.food,
                    qty: it.qty,
                    unit: it.unit,
                })),
            })),
        }))

    const saveDraft = async () => {
        if (!clientId) { message.warning('Select a client first'); return }
        if (days.length === 0) { message.warning('Add at least one day'); return }
        setSaving(true)
        try {
            if (planId) {
                await api.patch(`/diet-plans/${planId}`, { days: buildDaysPayload() })
            } else {
                const plan = await api.post('/diet-plans', {
                    clientId,
                    title: templateName || 'Custom Diet Plan',
                    days: buildDaysPayload(),
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
                })
                id = plan._id || plan.id
                setPlanId(id)
            } else {
                await api.patch(`/diet-plans/${id}`, { days: buildDaysPayload() })
            }
            await api.post(`/diet-plans/${id}/publish`)
            message.success('Plan published to client')
        } catch (err) {
            message.error(err.message || 'Failed to publish plan')
        } finally {
            setPublishing(false)
        }
    }

    const dayTotals = meals.reduce(
        (acc, m) => {
            m.items.forEach((it) => {
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
                <Button className="sm:ml-auto" type="dashed" icon={<CalendarOutlined />} onClick={() => setDayModal(true)}>
                    Add day
                </Button>
            </div>

            {days.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Segmented
                        value={activeDayId}
                        onChange={setActiveDayId}
                        options={days.map((d) => ({ label: d.day, value: d.id }))}
                    />
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => activeDayId && removeDay(activeDayId)}>
                        Remove day
                    </Button>
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

            {loading ? (
                <div className="flex justify-center py-16"><Spin size="large" /></div>
            ) : days.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No days yet"
                        description="Add a day like 'Monday' to begin — or 'Everyday' if the plan repeats daily."
                        action={<Button type="primary" icon={<CalendarOutlined />} onClick={() => setDayModal(true)}>Add day</Button>}
                    />
                </div>
            ) : meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No meals yet"
                        description={`Start building ${activeDay?.day || 'this day'}'s plan by adding a meal.`}
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openMealModal}>Add meal</Button>}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {meals.map((m) => {
                        const gl = mealGL(m.items)
                        const level = glMealLevel(gl)
                        return (
                            <div key={m.id} className="app-card p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-text-primary">{m.name}</div>
                                        <div className="flex items-center gap-1 text-xs text-text-muted"><ClockCircleOutlined /> {m.time}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.items.length > 0 && <GlycemicBadge type="Meal GL" value={gl} level={level} />}
                                        <Button size="small" icon={<PlusOutlined />} onClick={() => setFoodModal(m.id)}>Food</Button>
                                        <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeMeal(m.id)} />
                                    </div>
                                </div>

                                {/* Meal-level GI/GL alert, updates as quantities change */}
                                {level !== 'low' && (
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

                                {m.items.length > 0 && (
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
                                                {m.items.map((it, idx) => {
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
                                                                        onChange={(v) => changeQty(m.id, idx, v || step)}
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
                                                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeFood(m.id, idx)} />
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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
                    <Form.Item name="name" label="Meal name" rules={[{ required: true, message: 'Enter a meal name' }]}>
                        <Input placeholder="e.g. Breakfast" />
                    </Form.Item>
                    <Form.Item name="time" label="Time" rules={[{ required: true, message: 'Enter a time' }]}>
                        <Input placeholder="e.g. 08:00" />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Optional guidance" />
                    </Form.Item>
                </Form>
            </Modal>

            <FoodModal open={!!foodModal} onCancel={() => setFoodModal(null)} onAdd={addFoodToMeal} />

            <Modal
                title={<ModalTitle icon={<CalendarOutlined />} title="Add day" subtitle="e.g. Monday, or 'Everyday' if it repeats daily" />}
                open={dayModal}
                onCancel={() => setDayModal(false)}
                onOk={addDay}
                okText="Add day"
                okButtonProps={{ icon: <PlusOutlined /> }}
                centered
            >
                <Form form={dayForm} layout="vertical" className="mt-1">
                    <Form.Item name="day" label="Day" rules={[{ required: true, message: 'Enter a day' }]}>
                        <Input placeholder="e.g. Monday" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
