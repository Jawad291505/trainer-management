import { useMemo, useState, useEffect } from 'react'
import { Modal, Select, InputNumber, Segmented, Form, Input, Divider } from 'antd'
import { useLibrary } from '../../../context/LibraryContext'
import { foodCategories } from '../../../services/foodLibrary'
import {
    computeNutrition,
    formatQty,
    giLevel,
    glItemLevel,
    glycemicMeta,
} from '../../../utils/nutrition'
import GlycemicBadge from './GlycemicBadge'

// Lets the trainer pick a category → a food and set its quantity (macros + GI/GL
// recalculate live below), or add a fully custom food ("Add something else").
export default function FoodModal({ open, onCancel, onAdd }) {
    const { foods, addFood } = useLibrary()
    const [mode, setMode] = useState('library') // 'library' | 'custom'
    const [cat, setCat] = useState(foodCategories[0])
    const [foodId, setFoodId] = useState(null)
    const [qty, setQty] = useState(0)
    const [customForm] = Form.useForm()

    const food = useMemo(() => foods.find((f) => f.id === foodId), [foods, foodId])

    // Foods in the chosen category.
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

    // When a food is chosen, seed the quantity with its default.
    useEffect(() => {
        if (food) setQty(food.defaultQty)
    }, [food])

    // Reset everything each time the modal opens.
    useEffect(() => {
        if (open) {
            setMode('library')
            setCat(foodCategories[0])
            setFoodId(null)
            setQty(0)
            customForm.resetFields()
        }
    }, [open, customForm])

    // Live nutrition for the current selection + quantity.
    const nutrition = useMemo(() => (food ? computeNutrition(food, qty) : null), [food, qty])

    const handleOk = async () => {
        if (mode === 'custom') {
            const v = await customForm.validateFields()
            // Persist to the trainer's custom library so it's reusable.
            const created = addFood({
                name: v.name,
                category: v.category || foodCategories[0],
                unit: v.unit || 'g',
                // Macros are entered for `qty`, so use it as the base amount.
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
            onAdd({
                foodId: created.id,
                food: created.name,
                qty: v.qty,
                unit: created.unit,
                ...n,
            })
            return
        }
        if (!food) return
        onAdd({
            foodId: food.id,
            food: food.name,
            qty,
            unit: food.unit,
            ...nutrition,
        })
    }

    const unitLabel = food ? (food.unit === 'count' ? 'count' : food.unit) : 'g'

    return (
        <Modal
            title="Add food"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Add food"
            okButtonProps={{ disabled: mode === 'library' && !food }}
            centered
            width={520}
        >
            <div className="mt-4">
                <Segmented
                    block
                    value={mode}
                    onChange={setMode}
                    options={[
                        { value: 'library', label: 'From library' },
                        { value: 'custom', label: 'Add something else' },
                    ]}
                />
            </div>

            {mode === 'library' ? (
                <div className="mt-4">
                    <div className="grid grid-cols-2 gap-x-4">
                        <div>
                            <div className="mb-1 text-xs font-semibold text-text-secondary">Category</div>
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
                            <div className="mb-1 text-xs font-semibold text-text-secondary">Food</div>
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

                    {food && (
                        <>
                            <div className="mt-4 flex items-end gap-3">
                                <div className="flex-1">
                                    <div className="mb-1 text-xs font-semibold text-text-secondary">
                                        Quantity ({unitLabel})
                                    </div>
                                    <InputNumber
                                        min={food.step}
                                        step={food.step}
                                        value={qty}
                                        onChange={(v) => setQty(v || 0)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div className="pb-2 text-sm text-text-muted">
                                    = {formatQty(food, qty)}
                                </div>
                            </div>

                            {/* Quick-pick chips based on the food's step */}
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {[1, 2, 3, 4].map((mult) => {
                                    const q = food.unit === 'count' ? mult : food.step * mult
                                    return (
                                        <button
                                            key={mult}
                                            type="button"
                                            onClick={() => setQty(q)}
                                            className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                            style={{
                                                background:
                                                    qty === q ? 'var(--color-primary-soft)' : 'var(--color-surface-secondary)',
                                                color: qty === q ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            }}
                                        >
                                            {formatQty(food, q)}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Live-recalculated macros */}
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
                                        <div className="text-base font-extrabold text-text-primary">{m.value}</div>
                                        <div className="text-[11px] text-text-muted">{m.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* GI / GL for this food at this quantity */}
                            <div className="mt-3 flex items-center gap-2">
                                <GlycemicBadge type="GI" value={nutrition.gi} level={giLevel(nutrition.gi)} />
                                <GlycemicBadge type="GL" value={nutrition.gl} level={glItemLevel(nutrition.gl)} />
                                {glItemLevel(nutrition.gl) === 'high' && (
                                    <span className="text-xs font-medium" style={{ color: glycemicMeta.high.color }}>
                                        High glycemic load
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <Form form={customForm} layout="vertical" className="mt-4 builder-input">
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
                    <Divider className="my-2" plain>
                        <span className="text-xs text-text-muted">Nutrition for the quantity above</span>
                    </Divider>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="cal" label="Calories"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="gi" label="Glycemic Index"><InputNumber min={0} max={110} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="protein" label="Protein (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="carbs" label="Carbs (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="fat" label="Fats (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </div>
                </Form>
            )}
        </Modal>
    )
}
