import { useEffect, useMemo, useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, Tag, App } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    ClockCircleOutlined,
    ArrowLeftOutlined,
    SaveOutlined,
    AppleOutlined,
    ScheduleOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import GlycemicBadge from '../../../components/common/GlycemicBadge'
import ModalTitle from '../../../components/common/ModalTitle'
import { confirmDelete } from '../../../utils/confirm'
import { useLibrary } from '../../../context/LibraryContext'
import { foodCategories } from '../../../services/foodLibrary'
import { MAX_DIET_PLANS, dietGoals } from '../../../services/dietPlans'
import { computeNutrition, formatQty, mealGL, glMealLevel, glItemLevel, giLevel, glycemicMeta } from '../../../utils/nutrition'

let mealSeq = 1
const uid = (p) => `${p}${Date.now()}${mealSeq++}`

const planTotals = (meals) =>
    meals.reduce(
        (acc, m) => {
            m.items.forEach((it) => {
                acc.cal += it.cal || 0
                acc.protein += it.protein || 0
                acc.carbs += it.carbs || 0
                acc.fat += it.fat || 0
                acc.gl += it.gl || 0
            })
            return acc
        },
        { cal: 0, protein: 0, carbs: 0, fat: 0, gl: 0 },
    )

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10

export default function DietPlans() {
    const { message } = App.useApp()
    const { dietPlans, addDietPlan, updateDietPlan, removeDietPlan } = useLibrary()
    const [editingId, setEditingId] = useState(null)

    const editing = dietPlans.find((p) => p.id === editingId) || null
    const atMax = dietPlans.length >= MAX_DIET_PLANS

    const createPlan = () => {
        if (atMax) return
        const id = addDietPlan({ name: 'New template', goal: dietGoals[0], description: '', meals: [] })
        setEditingId(id)
    }

    const deletePlan = (p) =>
        confirmDelete({
            title: 'Delete template?',
            content: `Remove the "${p.name}" diet-plan template? Client plans already built from it are not affected.`,
            onOk: () => {
                removeDietPlan(p.id)
                message.success('Template deleted')
            },
        })

    if (editing) {
        return (
            <PlanEditor
                key={editing.id}
                plan={editing}
                onSave={(patch) => {
                    updateDietPlan(editing.id, patch)
                    message.success('Template saved')
                    setEditingId(null)
                }}
                onBack={() => setEditingId(null)}
            />
        )
    }

    return (
        <div>
            <PageHeader
                title="Diet Plans"
                subtitle={`Reusable templates trainers apply to a client's diet. Maximum of ${MAX_DIET_PLANS}.`}
            >
                <Button type="primary" icon={<PlusOutlined />} onClick={createPlan} disabled={atMax}>
                    New template
                </Button>
            </PageHeader>

            {atMax && (
                <div
                    className="mb-4 rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
                >
                    You have reached the maximum of {MAX_DIET_PLANS} templates. Delete one to add another.
                </div>
            )}

            {dietPlans.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No templates yet"
                        description="Create a reusable diet-plan template built from the food library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={createPlan}>New template</Button>}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {dietPlans.map((p) => {
                        const t = planTotals(p.meals)
                        return (
                            <div key={p.id} className="app-card flex flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-bold text-text-primary">{p.name}</div>
                                        <Tag bordered={false} style={{ borderRadius: 999, marginTop: 4 }}>{p.goal}</Tag>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingId(p.id)}>Edit</Button>
                                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deletePlan(p)} />
                                    </div>
                                </div>
                                {p.description && <p className="mt-2 mb-0 text-sm text-text-secondary">{p.description}</p>}
                                <div
                                    className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-center"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <Stat label="Meals" value={p.meals.length} />
                                    <Stat label="Calories" value={t.cal} />
                                    <Stat label="Protein" value={`${Math.round(t.protein)}g`} />
                                    <Stat
                                        label="Glycemic Load"
                                        value={r1(t.gl)}
                                        color={glycemicMeta[glMealLevel(t.gl)].color}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function Stat({ label, value, color }) {
    return (
        <div>
            <div className="text-sm font-bold" style={{ color: color || 'var(--color-text-primary)' }}>{value}</div>
            <div className="text-[11px] text-text-muted">{label}</div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Plan editor                                                        */
/* ------------------------------------------------------------------ */
function PlanEditor({ plan, onSave, onBack }) {
    const { message } = App.useApp()
    const [name, setName] = useState(plan.name)
    const [goal, setGoal] = useState(plan.goal)
    const [description, setDescription] = useState(plan.description || '')
    const [meals, setMeals] = useState(() => plan.meals.map((m) => ({ ...m, items: m.items.map((it) => ({ ...it })) })))

    const [mealModal, setMealModal] = useState(false)
    const [foodModal, setFoodModal] = useState(null) // mealId
    const [mealForm] = Form.useForm()

    const totals = useMemo(() => planTotals(meals), [meals])

    const addMeal = async () => {
        const v = await mealForm.validateFields()
        setMeals((prev) => [...prev, { id: uid('M'), name: v.name, time: v.time, notes: v.notes || '', items: [] }])
        mealForm.resetFields()
        setMealModal(false)
    }
    const removeMeal = (id) => setMeals((prev) => prev.filter((m) => m.id !== id))
    const addItem = (mealId, item) =>
        setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, items: [...m.items, item] } : m)))
    const removeItem = (mealId, idx) =>
        setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== idx) } : m)))

    return (
        <div>
            <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                className="mb-2"
                style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}
            >
                Back to templates
            </Button>

            <PageHeader title="Edit template" subtitle="Built from the food library. Trainers copy this into a client's diet.">
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSave({ name: name.trim() || 'Untitled', goal, description: description.trim(), meals })}
                >
                    Save template
                </Button>
            </PageHeader>

            <div className="app-card mb-4 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Template name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fat Loss — Standard" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Goal</label>
                        <Select
                            value={goal}
                            onChange={setGoal}
                            style={{ width: '100%' }}
                            options={dietGoals.map((g) => ({ value: g, label: g }))}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Description</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary of the template" />
                    </div>
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                >
                    {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </span>
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} onClick={() => setMealModal(true)}>
                    Add meal
                </Button>
            </div>

            <div className="app-card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-5">
                {[
                    { label: 'Calories', value: `${totals.cal}` },
                    { label: 'Protein', value: `${Math.round(totals.protein)}g` },
                    { label: 'Carbs', value: `${Math.round(totals.carbs)}g` },
                    { label: 'Fats', value: `${Math.round(totals.fat)}g` },
                    { label: 'Glycemic Load', value: `${r1(totals.gl)}`, level: glMealLevel(totals.gl) },
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

            {meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No meals yet"
                        description="Add a meal, then add foods to it from the library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMealModal(true)}>Add meal</Button>}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {meals.map((m) => {
                        const gl = mealGL(m.items)
                        return (
                            <div key={m.id} className="app-card p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-text-primary">{m.name}</div>
                                        <div className="flex items-center gap-1 text-xs text-text-muted">
                                            <ClockCircleOutlined /> {m.time}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {m.items.length > 0 && (
                                            <GlycemicBadge type="Meal GL" value={gl} level={glMealLevel(gl)} />
                                        )}
                                        <Button size="small" icon={<PlusOutlined />} onClick={() => setFoodModal(m.id)}>Food</Button>
                                        <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeMeal(m.id)} />
                                    </div>
                                </div>

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
                                                {m.items.map((it, idx) => (
                                                    <tr key={idx} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                                        <td className="px-3 py-2 font-medium text-text-primary">{it.food}</td>
                                                        <td className="px-3 py-2 text-text-secondary">
                                                            {it.qty}
                                                            {it.unit === 'count' ? '' : ` ${it.unit}`}
                                                        </td>
                                                        <td className="px-3 py-2 text-right text-text-secondary">{it.cal}</td>
                                                        <td className="hidden px-3 py-2 text-right text-text-muted sm:table-cell">{it.protein}/{it.carbs}/{it.fat}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <GlycemicBadge type="GL" value={it.gl || 0} level={glItemLevel(it.gl || 0)} />
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(m.id, idx)} />
                                                        </td>
                                                    </tr>
                                                ))}
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
                title={<ModalTitle icon={<ScheduleOutlined />} title="Add meal" subtitle="A slot in the day — add foods to it next" />}
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

            <FoodPickerModal
                open={!!foodModal}
                onCancel={() => setFoodModal(null)}
                onAdd={(item) => {
                    addItem(foodModal, item)
                    setFoodModal(null)
                    message.success('Food added')
                }}
            />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Food picker: category -> food -> quantity, with live nutrition     */
/* ------------------------------------------------------------------ */
function FoodPickerModal({ open, onCancel, onAdd }) {
    const { foods } = useLibrary()
    const [cat, setCat] = useState(foodCategories[0])
    const [foodId, setFoodId] = useState(null)
    const [qty, setQty] = useState(0)

    const food = useMemo(() => foods.find((f) => f.id === foodId), [foods, foodId])
    const foodsInCat = useMemo(
        () => foods.filter((f) => f.category === cat).map((f) => ({ value: f.id, label: f.name })),
        [foods, cat],
    )
    const nutrition = useMemo(() => (food ? computeNutrition(food, qty) : null), [food, qty])

    useEffect(() => {
        if (open) {
            setCat(foodCategories[0])
            setFoodId(null)
            setQty(0)
        }
    }, [open])

    const unitLabel = food ? (food.unit === 'count' ? '' : food.unit) : ''

    return (
        <Modal
            title={<ModalTitle icon={<AppleOutlined />} title="Add food" subtitle="Pick from the library — macros update live" />}
            open={open}
            onCancel={onCancel}
            onOk={() => {
                if (!food) return
                onAdd({ foodId: food.id, food: food.name, qty, unit: food.unit, ...nutrition })
            }}
            okText="Add food"
            okButtonProps={{ icon: <PlusOutlined />, disabled: !food }}
            centered
            width={560}
        >
            <div className="mt-1 grid grid-cols-2 gap-x-4">
                <div>
                    <span className="field-label">Category</span>
                    <Select
                        value={cat}
                        onChange={(c) => {
                            setCat(c)
                            setFoodId(null)
                            setQty(0)
                        }}
                        options={foodCategories.map((c) => ({ value: c, label: c }))}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <span className="field-label">Food</span>
                    <Select
                        showSearch
                        placeholder="Select a food…"
                        value={foodId}
                        onChange={(v) => {
                            setFoodId(v)
                            const f = foods.find((x) => x.id === v)
                            if (f) setQty(f.defaultQty)
                        }}
                        options={foodsInCat}
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {!food ? (
                <div
                    className="mt-4 rounded-xl border border-dashed py-8 text-center text-sm text-text-muted"
                    style={{ borderColor: 'var(--color-border-strong)' }}
                >
                    Pick a food to set the quantity and see its nutrition.
                </div>
            ) : (
                <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="font-bold text-text-primary">{food.name}</div>
                            <span
                                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                            >
                                {food.category}
                            </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                            <GlycemicBadge type="GI" value={nutrition.gi} level={giLevel(nutrition.gi)} />
                            <GlycemicBadge type="GL" value={nutrition.gl} level={glItemLevel(nutrition.gl)} />
                        </div>
                    </div>

                    <div className="mt-4 flex items-end gap-3">
                        <div className="flex-1">
                            <span className="field-label">Quantity{unitLabel ? ` (${unitLabel})` : ''}</span>
                            <InputNumber
                                min={food.step}
                                step={food.step}
                                value={qty}
                                onChange={(v) => setQty(v || 0)}
                                addonAfter={food.unit === 'count' ? null : food.unit}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="pb-1.5 text-sm font-semibold text-text-secondary">{formatQty(food, qty)}</div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {[1, 2, 3, 4].map((mult) => {
                            const q = food.unit === 'count' ? mult : food.step * mult
                            const active = qty === q
                            return (
                                <button
                                    key={mult}
                                    type="button"
                                    onClick={() => setQty(q)}
                                    className="rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
                                    style={{
                                        background: active ? 'var(--color-primary)' : 'var(--color-surface-secondary)',
                                        color: active ? '#fff' : 'var(--color-text-secondary)',
                                    }}
                                >
                                    {formatQty(food, q)}
                                </button>
                            )
                        })}
                    </div>

                    <div
                        className="mt-4 grid grid-cols-4 gap-2 rounded-xl p-3 text-center"
                        style={{ background: 'var(--color-surface-secondary)' }}
                    >
                        {[
                            { label: 'Calories', value: nutrition.cal },
                            { label: 'Protein', value: `${nutrition.protein}g` },
                            { label: 'Carbs', value: `${nutrition.carbs}g` },
                            { label: 'Fats', value: `${nutrition.fat}g` },
                        ].map((mm) => (
                            <div key={mm.label}>
                                <div className="text-lg font-extrabold text-text-primary">{mm.value}</div>
                                <div className="text-[11px] text-text-muted">{mm.label}</div>
                            </div>
                        ))}
                    </div>

                    {glItemLevel(nutrition.gl) === 'high' && (
                        <div className="mt-2 text-xs font-medium" style={{ color: glycemicMeta.high.color }}>
                            High glycemic load — consider a lower-GI carb or a smaller portion.
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}
