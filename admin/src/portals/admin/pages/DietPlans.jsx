import { useMemo, useState } from 'react'
import { Select, Segmented, Button, Modal, Form, Input, InputNumber, Tag, App } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    ClockCircleOutlined,
    ArrowLeftOutlined,
    SaveOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import TagSelect from '../../../components/common/TagSelect'
import { formatAmount, formatQty, scaleFoodMacros } from '../../../utils/foodScale'
import { confirmDelete } from '../../../utils/confirm'
import {
    generalDietPlans,
    MAX_GENERAL_DIET_PLANS,
    foodCategories,
    getFoodsByCategory,
} from '../../../services/masterData'
import { clientGoals } from '../../../services/mockData'

let seq = 1
const uid = (p) => `${p}-${Date.now()}-${seq++}`

// Deep-clone the seed templates so edits never touch the imported module.
const clonePlans = () =>
    generalDietPlans.map((p) => ({
        ...p,
        meals: p.meals.map((m) => ({ ...m, id: uid('M'), items: m.items.map((it) => ({ ...it })) })),
    }))

const mealTotals = (meals) =>
    meals.reduce(
        (acc, m) => {
            m.items.forEach((it) => {
                acc.cal += it.cal || 0
                acc.protein += it.protein || 0
                acc.carbs += it.carbs || 0
                acc.fat += it.fat || 0
            })
            return acc
        },
        { cal: 0, protein: 0, carbs: 0, fat: 0 },
    )

export default function DietPlans() {
    const { message } = App.useApp()
    const [plans, setPlans] = useState(clonePlans)
    const [editingId, setEditingId] = useState(null)

    const editing = plans.find((p) => p.id === editingId) || null

    const createPlan = () => {
        if (plans.length >= MAX_GENERAL_DIET_PLANS) return
        const p = { id: uid('GDP'), title: 'New general plan', goal: clientGoals[0], description: '', meals: [] }
        setPlans((prev) => [...prev, p])
        setEditingId(p.id)
    }

    const deletePlan = (p) =>
        confirmDelete({
            title: 'Delete general plan?',
            content: `Remove the "${p.title}" template? Client plans already created from it are not affected.`,
            onOk: () => {
                setPlans((prev) => prev.filter((x) => x.id !== p.id))
                message.success('General plan deleted')
            },
        })

    const updateEditing = (patch) =>
        setPlans((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...patch } : p)))

    if (editing) {
        return (
            <PlanEditor
                plan={editing}
                onChange={updateEditing}
                onBack={() => setEditingId(null)}
                onSave={() => {
                    message.success('General plan saved')
                    setEditingId(null)
                }}
            />
        )
    }

    const atMax = plans.length >= MAX_GENERAL_DIET_PLANS

    return (
        <div>
            <PageHeader
                title="General Diet Plans"
                subtitle={`Reusable templates trainers apply to a client's diet. Maximum of ${MAX_GENERAL_DIET_PLANS}.`}
            >
                <Button type="primary" icon={<PlusOutlined />} onClick={createPlan} disabled={atMax}>
                    New general plan
                </Button>
            </PageHeader>

            {atMax && (
                <div className="mb-4 rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                    You have reached the maximum of {MAX_GENERAL_DIET_PLANS} general diet plans. Delete one to add another.
                </div>
            )}

            {plans.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No general plans yet"
                        description="Create a reusable diet template built from the food library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={createPlan}>New general plan</Button>}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {plans.map((p) => {
                        const t = mealTotals(p.meals)
                        return (
                            <div key={p.id} className="app-card flex flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-bold text-text-primary">{p.title}</div>
                                        <Tag bordered={false} style={{ borderRadius: 999, marginTop: 4 }}>{p.goal}</Tag>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingId(p.id)}>Edit</Button>
                                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deletePlan(p)} />
                                    </div>
                                </div>
                                {p.description && <p className="mt-2 mb-0 text-sm text-text-secondary">{p.description}</p>}
                                <div className="mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-center" style={{ borderColor: 'var(--color-border)' }}>
                                    <Stat label="Meals" value={p.meals.length} />
                                    <Stat label="Calories" value={t.cal} />
                                    <Stat label="Protein" value={`${t.protein}g`} />
                                    <Stat label="Carbs" value={`${t.carbs}g`} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function Stat({ label, value }) {
    return (
        <div>
            <div className="text-sm font-bold text-text-primary">{value}</div>
            <div className="text-[11px] text-text-muted">{label}</div>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Plan editor — meal / food builder (foods come from the library)    */
/* ------------------------------------------------------------------ */
function PlanEditor({ plan, onChange, onBack, onSave }) {
    const { message } = App.useApp()
    const [mealModal, setMealModal] = useState(false)
    const [foodModal, setFoodModal] = useState(null) // mealId
    const [mealForm] = Form.useForm()
    const [foodForm] = Form.useForm()
    const [foodCat, setFoodCat] = useState(foodCategories[0])
    const [foodMode, setFoodMode] = useState('library') // 'library' | 'custom'
    const [foodBase, setFoodBase] = useState(null) // picked library food, for macro scaling

    const totals = useMemo(() => mealTotals(plan.meals), [plan.meals])

    const addMeal = async () => {
        const v = await mealForm.validateFields()
        onChange({ meals: [...plan.meals, { id: uid('M'), name: v.name, time: v.time, items: [], notes: v.notes || '' }] })
        mealForm.resetFields()
        setMealModal(false)
        message.success('Meal added')
    }

    const removeMeal = (id) => {
        onChange({ meals: plan.meals.filter((m) => m.id !== id) })
        message.success('Meal removed')
    }

    const openFoodModal = (mealId) => {
        foodForm.resetFields()
        foodForm.setFieldsValue({ amount: 1, cal: 0, protein: 0, carbs: 0, fat: 0 })
        setFoodCat(foodCategories[0])
        setFoodMode('library')
        setFoodBase(null)
        setFoodModal(mealId)
    }

    // Picking a library food pre-fills the form and remembers the base serving,
    // so the macros can rescale automatically when the amount is changed.
    const pickLibraryFood = (name) => {
        const f = getFoodsByCategory(foodCat).find((x) => x.food === name)
        if (!f) return
        setFoodBase(f)
        foodForm.setFieldsValue({
            food: f.food,
            amount: f.amount,
            unit: f.unit,
            cal: f.cal,
            protein: f.protein,
            carbs: f.carbs,
            fat: f.fat,
        })
    }

    // Rescale macros from the library base serving whenever the amount changes.
    const onFoodValuesChange = (changed) => {
        if (!('amount' in changed) || foodMode !== 'library' || !foodBase) return
        const next = scaleFoodMacros(foodBase, changed.amount)
        if (next) foodForm.setFieldsValue(next)
    }

    const addFood = async () => {
        const v = await foodForm.validateFields()
        const item = {
            food: v.food,
            amount: Number(v.amount) || 0,
            unit: (v.unit || '').trim(),
            cal: v.cal || 0,
            protein: v.protein || 0,
            carbs: v.carbs || 0,
            fat: v.fat || 0,
        }
        onChange({
            meals: plan.meals.map((m) =>
                m.id === foodModal ? { ...m, items: [...m.items, item] } : m,
            ),
        })
        foodForm.resetFields()
        setFoodModal(null)
        message.success('Food added')
    }

    const removeFood = (mealId, idx) =>
        onChange({
            meals: plan.meals.map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== idx) } : m)),
        })

    return (
        <div>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} className="mb-2" style={{ color: 'var(--color-text-secondary)', paddingLeft: 0 }}>
                Back to general plans
            </Button>

            <PageHeader title="Edit general plan" subtitle="Built from the food library. Trainers copy this into a client's diet.">
                <Button type="primary" icon={<SaveOutlined />} onClick={onSave}>Save plan</Button>
            </PageHeader>

            <div className="app-card mb-4 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Plan title</label>
                        <Input value={plan.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Fat Loss — Standard" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Goal</label>
                        <TagSelect
                            value={plan.goal}
                            onChange={(g) => onChange({ goal: g || '' })}
                            options={clientGoals}
                            style={{ width: '100%' }}
                            placeholder="Select or type a goal"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Description</label>
                        <Input value={plan.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Short summary of the template" />
                    </div>
                </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                >
                    {plan.meals.length} {plan.meals.length === 1 ? 'meal' : 'meals'}
                </span>
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} onClick={() => setMealModal(true)}>
                    Add meal
                </Button>
            </div>

            <div className="app-card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                {[
                    { label: 'Calories', value: `${totals.cal}` },
                    { label: 'Protein', value: `${totals.protein}g` },
                    { label: 'Carbs', value: `${totals.carbs}g` },
                    { label: 'Fats', value: `${totals.fat}g` },
                ].map((t) => (
                    <div key={t.label} className="text-center">
                        <div className="text-lg font-extrabold text-text-primary">{t.value}</div>
                        <div className="text-[11px] text-text-muted">{t.label}</div>
                    </div>
                ))}
            </div>

            {plan.meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No meals yet"
                        description="Add a meal, then add foods to it from the library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setMealModal(true)}>Add meal</Button>}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {plan.meals.map((m) => (
                        <div key={m.id} className="app-card p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-text-primary">{m.name}</div>
                                    <div className="flex items-center gap-1 text-xs text-text-muted"><ClockCircleOutlined /> {m.time}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="small" icon={<PlusOutlined />} onClick={() => openFoodModal(m.id)}>Food</Button>
                                    <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeMeal(m.id)} />
                                </div>
                            </div>

                            {m.items.length > 0 && (
                                <div className="mt-3 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ background: 'var(--color-surface-secondary)' }}>
                                                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Food</th>
                                                <th className="px-3 py-2 text-left font-semibold text-text-secondary">Qty</th>
                                                <th className="px-3 py-2 text-right font-semibold text-text-secondary">Cal</th>
                                                <th className="hidden px-3 py-2 text-right font-semibold text-text-secondary sm:table-cell">P/C/F</th>
                                                <th className="w-10 px-3 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {m.items.map((it, idx) => (
                                                <tr key={idx} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                                                    <td className="px-3 py-2 font-medium text-text-primary">{it.food}</td>
                                                    <td className="px-3 py-2 text-text-secondary">{formatQty(it)}</td>
                                                    <td className="px-3 py-2 text-right text-text-secondary">{it.cal}</td>
                                                    <td className="hidden px-3 py-2 text-right text-text-muted sm:table-cell">{it.protein}/{it.carbs}/{it.fat}</td>
                                                    <td className="px-3 py-2 text-right">
                                                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeFood(m.id, idx)} />
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
                    ))}
                </div>
            )}

            <Modal title="Add meal" open={mealModal} onCancel={() => setMealModal(false)} onOk={addMeal} okText="Add meal" centered>
                <Form form={mealForm} layout="vertical" className="mt-4">
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

            <Modal title="Add food" open={!!foodModal} onCancel={() => setFoodModal(null)} onOk={addFood} okText="Add food" centered>
                <div className="mt-4">
                    <Segmented
                        value={foodMode}
                        onChange={(m) => {
                            setFoodMode(m)
                            if (m === 'custom') setFoodBase(null)
                        }}
                        options={[
                            { value: 'library', label: 'From library' },
                            { value: 'custom', label: 'Custom food' },
                        ]}
                    />
                </div>

                {foodMode === 'library' && (
                    <div className="mt-3 grid grid-cols-2 gap-x-4">
                        <div className="mb-3">
                            <label className="mb-1 block text-xs font-semibold text-text-secondary">Library category</label>
                            <Select
                                value={foodCat}
                                onChange={(c) => setFoodCat(c)}
                                style={{ width: '100%' }}
                                options={foodCategories.map((c) => ({ value: c, label: c }))}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="mb-1 block text-xs font-semibold text-text-secondary">Library food</label>
                            <Select
                                placeholder="Pick to pre-fill"
                                style={{ width: '100%' }}
                                onChange={pickLibraryFood}
                                options={getFoodsByCategory(foodCat).map((f) => ({ value: f.food, label: f.food }))}
                            />
                        </div>
                    </div>
                )}

                <Form form={foodForm} layout="vertical" className="builder-input mt-3" onValuesChange={onFoodValuesChange}>
                    <Form.Item name="food" label="Food" rules={[{ required: true, message: 'Enter a food' }]}>
                        <Input placeholder="e.g. Grilled chicken" />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item
                            name="amount"
                            label="Amount"
                            rules={[{ required: true, message: 'Enter an amount' }]}
                            extra={
                                foodMode === 'library' && foodBase
                                    ? `Macros scale from ${formatAmount(foodBase.amount)} ${foodBase.unit}`
                                    : undefined
                            }
                        >
                            <InputNumber min={0} step={0.25} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="unit" label="Unit" rules={[{ required: foodMode === 'custom', message: 'Enter a unit' }]}>
                            <Input placeholder="e.g. g, cup, medium" disabled={foodMode === 'library'} />
                        </Form.Item>
                        <Form.Item name="cal" label="Calories"><InputNumber min={0} /></Form.Item>
                        <Form.Item name="protein" label="Protein (g)"><InputNumber min={0} /></Form.Item>
                        <Form.Item name="carbs" label="Carbs (g)"><InputNumber min={0} /></Form.Item>
                        <Form.Item name="fat" label="Fats (g)"><InputNumber min={0} /></Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
