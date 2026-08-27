import { useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    ClockCircleOutlined,
    SaveOutlined,
    SendOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import { clients, sampleDietPlan } from '../../../services/mockData'

let mealSeq = 100

export default function DietPlans() {
    const { message } = App.useApp()
    const [clientId, setClientId] = useState(sampleDietPlan.clientId)
    const [meals, setMeals] = useState(sampleDietPlan.meals)
    const [mealModal, setMealModal] = useState(false)
    const [foodModal, setFoodModal] = useState(null) // mealId
    const [mealForm] = Form.useForm()
    const [foodForm] = Form.useForm()

    const openMealModal = () => setMealModal(true)

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

    const addFood = async () => {
        const v = await foodForm.validateFields()
        setMeals((prev) =>
            prev.map((m) =>
                m.id === foodModal
                    ? { ...m, items: [...m.items, { food: v.food, qty: v.qty, cal: v.cal || 0, protein: v.protein || 0, carbs: v.carbs || 0, fat: v.fat || 0 }] }
                    : m,
            ),
        )
        foodForm.resetFields()
        setFoodModal(null)
        message.success('Food added')
    }

    const removeFood = (mealId, idx) => {
        setMeals((prev) => prev.map((m) => (m.id === mealId ? { ...m, items: m.items.filter((_, i) => i !== idx) } : m)))
    }

    const dayTotals = meals.reduce(
        (acc, m) => {
            m.items.forEach((it) => {
                acc.cal += it.cal
                acc.protein += it.protein
                acc.carbs += it.carbs
                acc.fat += it.fat
            })
            return acc
        },
        { cal: 0, protein: 0, carbs: 0, fat: 0 },
    )

    return (
        <div>
            <PageHeader title="Diet Plans" subtitle="Build and publish customized meal plans.">
                <Button icon={<SaveOutlined />} onClick={() => message.success('Draft saved')}>Save draft</Button>
                <Button type="primary" icon={<SendOutlined />} onClick={() => message.success('Plan published to client')}>Publish</Button>
            </PageHeader>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-sm font-semibold text-text-secondary">Client</span>
                <Select
                    value={clientId}
                    onChange={setClientId}
                    style={{ width: 240 }}
                    options={clients.map((c) => ({ value: c.id, label: c.name }))}
                />
                <span
                    className="rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                >
                    {meals.length} {meals.length === 1 ? 'meal' : 'meals'}
                </span>
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} onClick={openMealModal}>
                    Add meal
                </Button>
            </div>

            {/* Daily totals bar */}
            <div className="app-card mb-4 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                {[
                    { label: 'Calories', value: `${dayTotals.cal}` },
                    { label: 'Protein', value: `${dayTotals.protein}g` },
                    { label: 'Carbs', value: `${dayTotals.carbs}g` },
                    { label: 'Fats', value: `${dayTotals.fat}g` },
                ].map((t) => (
                    <div key={t.label} className="text-center">
                        <div className="text-lg font-extrabold text-text-primary">{t.value}</div>
                        <div className="text-[11px] text-text-muted">{t.label}</div>
                    </div>
                ))}
            </div>

            {meals.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No meals yet"
                        description="Start building the plan by adding a meal."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openMealModal}>Add meal</Button>}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {meals.map((m) => (
                        <div key={m.id} className="app-card p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-text-primary">{m.name}</div>
                                    <div className="flex items-center gap-1 text-xs text-text-muted"><ClockCircleOutlined /> {m.time}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="small" icon={<PlusOutlined />} onClick={() => setFoodModal(m.id)}>Food</Button>
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
                                                    <td className="px-3 py-2 text-text-secondary">{it.qty}</td>
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
                <Form form={foodForm} layout="vertical" className="mt-4 builder-input">
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="food" label="Food" rules={[{ required: true, message: 'Enter a food' }]}>
                            <Input placeholder="e.g. Grilled chicken" />
                        </Form.Item>
                        <Form.Item name="qty" label="Quantity" rules={[{ required: true, message: 'Enter a quantity' }]}>
                            <Input placeholder="e.g. 150g" />
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
