import { useMemo, useState, useEffect } from 'react'
import { Modal, Select, InputNumber, Segmented, Form, Input, Button } from 'antd'
import { AppleOutlined, PlusOutlined } from '@ant-design/icons'
import { useLibrary } from '../../../context/LibraryContext'
import { foodCategories } from '../../../services/foodLibrary'
import {
    computeNutrition,
    formatQty,
    giLevel,
    glItemLevel,
    glycemicMeta,
} from '../../../utils/nutrition'
import ModalTitle from '../../../components/common/ModalTitle'
import GlycemicBadge from './GlycemicBadge'

// Pick a category → a food and set its quantity (macros + GI/GL recalculate live
// below), or add a fully custom food ("Add something else").
export default function FoodModal({ open, onCancel, onAdd }) {
    const { foods, addFood } = useLibrary()
    const [mode, setMode] = useState('library') // 'library' | 'custom'
    const [cat, setCat] = useState(foodCategories[0])
    const [foodId, setFoodId] = useState(null)
    const [qty, setQty] = useState(0)
    const [customForm] = Form.useForm()

    const food = useMemo(() => foods.find((f) => f.id === foodId), [foods, foodId])

    const foodsInCat = useMemo(
        () =>
            foods
                .filter((f) => f.category === cat)
                .map((f) => ({
                    value: f.id,
                    label: `${f.name}${f.source === 'trainer' ? ' (custom)' : ''}`,
                })),
        [foods, cat],
    )

    useEffect(() => {
        if (food) setQty(food.defaultQty)
    }, [food])

    useEffect(() => {
        if (open) {
            setMode('library')
            setCat(foodCategories[0])
            setFoodId(null)
            setQty(0)
            customForm.resetFields()
        }
    }, [open, customForm])

    const nutrition = useMemo(() => (food ? computeNutrition(food, qty) : null), [food, qty])

    const handleOk = async () => {
        if (mode === 'custom') {
            const v = await customForm.validateFields()
            const created = addFood({
                name: v.name,
                category: v.category || foodCategories[0],
                unit: v.unit || 'g',
                base: v.qty,
                step: v.unit === 'count' ? 1 : 10,
                defaultQty: v.qty,
                gi: v.gi || 0,
                cal: v.cal || 0,
                protein: v.protein || 0,
                carbs: v.carbs || 0,
                fat: v.fat || 0,
            })
            const n = computeNutrition(created, v.qty)
            onAdd({ foodId: created.id, food: created.name, qty: v.qty, unit: created.unit, ...n })
            return
        }
        if (!food) return
        onAdd({ foodId: food.id, food: food.name, qty, unit: food.unit, ...nutrition })
    }

    const unitLabel = food ? (food.unit === 'count' ? '' : food.unit) : ''

    return (
        <Modal
            title={
                <ModalTitle
                    icon={<AppleOutlined />}
                    title="Add food"
                    subtitle={mode === 'library' ? 'Pick from the library — macros update live' : 'Enter a food that isn’t in the library'}
                />
            }
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Add food"
            okButtonProps={{ icon: <PlusOutlined />, disabled: mode === 'library' && !food }}
            centered
            width={560}
        >
            <Segmented
                block
                value={mode}
                onChange={setMode}
                options={[
                    { value: 'library', label: 'From library' },
                    { value: 'custom', label: 'Add something else' },
                ]}
            />

            {mode === 'library' ? (
                <div className="mt-4">
                    <div className="grid grid-cols-2 gap-x-4">
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
                                onChange={setFoodId}
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
                            {/* header: name + category / GI · GL */}
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

                            {/* quantity */}
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
                                <div className="pb-1.5 text-sm font-semibold text-text-secondary">
                                    {formatQty(food, qty)}
                                </div>
                            </div>

                            {/* quick picks */}
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

                            {/* macros */}
                            <div
                                className="mt-4 grid grid-cols-4 gap-2 rounded-xl p-3 text-center"
                                style={{ background: 'var(--color-surface-secondary)' }}
                            >
                                {[
                                    { label: 'Calories', value: nutrition.cal },
                                    { label: 'Protein', value: `${nutrition.protein}g` },
                                    { label: 'Carbs', value: `${nutrition.carbs}g` },
                                    { label: 'Fats', value: `${nutrition.fat}g` },
                                ].map((m) => (
                                    <div key={m.label}>
                                        <div className="text-lg font-extrabold text-text-primary">{m.value}</div>
                                        <div className="text-[11px] text-text-muted">{m.label}</div>
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
                </div>
            ) : (
                <Form form={customForm} layout="vertical" className="mt-4 builder-input">
                    <div className="modal-section">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Food</div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Form.Item name="name" label="Food name" rules={[{ required: true, message: 'Enter a name' }]}>
                                <Input placeholder="e.g. Homemade smoothie" />
                            </Form.Item>
                            <Form.Item name="category" label="Category" initialValue={foodCategories[0]}>
                                <Select options={foodCategories.map((c) => ({ value: c, label: c }))} />
                            </Form.Item>
                            <Form.Item name="unit" label="Unit" initialValue="g">
                                <Select
                                    options={[
                                        { value: 'g', label: 'Grams (g)' },
                                        { value: 'ml', label: 'Millilitres (ml)' },
                                        { value: 'count', label: 'Count' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item name="qty" label="Quantity" rules={[{ required: true, message: 'Enter a quantity' }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                        </div>
                    </div>

                    <div className="modal-section">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                            Nutrition for that quantity
                        </div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Form.Item name="cal" label="Calories"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                            <Form.Item name="gi" label="Glycemic Index"><InputNumber min={0} max={110} style={{ width: '100%' }} /></Form.Item>
                            <Form.Item name="protein" label="Protein (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                            <Form.Item name="carbs" label="Carbs (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                            <Form.Item name="fat" label="Fats (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        </div>
                    </div>
                </Form>
            )}
        </Modal>
    )
}
