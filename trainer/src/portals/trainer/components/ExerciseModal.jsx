import { useMemo, useState, useEffect } from 'react'
import { Modal, Select, Segmented, Form, Input, InputNumber, Checkbox } from 'antd'
import { ThunderboltOutlined, PlusOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useLibrary } from '../../../context/LibraryContext'
import { exerciseCategories } from '../../../services/exerciseLibrary'
import ModalTitle from '../../../components/common/ModalTitle'

// Add an exercise to a day: pick a category → an exercise (defaults prefill), or
// create a brand-new one that can be saved to the trainer's own library.
export default function ExerciseModal({ open, onCancel, onAdd }) {
    const { exercises, addExercise } = useLibrary()
    const [mode, setMode] = useState('library')
    const [cat, setCat] = useState(exerciseCategories[0])
    const [exId, setExId] = useState(null)
    const [pickForm] = Form.useForm()
    const [newForm] = Form.useForm()

    const exercise = useMemo(() => exercises.find((x) => x.id === exId), [exercises, exId])

    const exInCat = useMemo(
        () =>
            exercises
                .filter((x) => x.category === cat)
                .map((x) => ({ value: x.id, label: `${x.name}${x.source === 'trainer' ? ' (custom)' : ''}` })),
        [exercises, cat],
    )

    useEffect(() => {
        if (open) {
            setMode('library')
            setCat(exerciseCategories[0])
            setExId(null)
            pickForm.resetFields()
            newForm.resetFields()
        }
    }, [open, pickForm, newForm])

    useEffect(() => {
        if (exercise) {
            pickForm.setFieldsValue({
                sets: exercise.defaultSets,
                reps: exercise.defaultReps,
                rest: exercise.defaultRest,
                notes: exercise.notes,
            })
        }
    }, [exercise, pickForm])

    const handleOk = async () => {
        if (mode === 'library') {
            if (!exercise) return
            const v = await pickForm.validateFields()
            onAdd({
                exerciseId: exercise.id,
                name: exercise.name,
                sets: v.sets,
                reps: v.reps,
                rest: v.rest || '60s',
                youtube: exercise.youtube || '',
                notes: v.notes || '',
            })
            return
        }
        const v = await newForm.validateFields()
        let created = null
        if (v.saveToLibrary) {
            created = addExercise({
                name: v.name,
                category: v.category || exerciseCategories[0],
                defaultSets: v.sets,
                defaultReps: v.reps,
                defaultRest: v.rest || '60s',
                youtube: v.youtube || '',
                notes: v.notes || '',
            })
        }
        onAdd({
            exerciseId: created ? created.id : null,
            name: v.name,
            sets: v.sets,
            reps: v.reps,
            rest: v.rest || '60s',
            youtube: v.youtube || '',
            notes: v.notes || '',
        })
    }

    return (
        <Modal
            title={
                <ModalTitle
                    icon={<ThunderboltOutlined />}
                    title="Add exercise"
                    subtitle={mode === 'library' ? 'Pick from the library — sets & reps prefill' : 'Create a new exercise'}
                />
            }
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Add exercise"
            okButtonProps={{ icon: <PlusOutlined />, disabled: mode === 'library' && !exercise }}
            centered
            width={560}
        >
            <Segmented
                block
                value={mode}
                onChange={setMode}
                options={[
                    { value: 'library', label: 'From library' },
                    { value: 'custom', label: 'Create new' },
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
                                    setExId(null)
                                }}
                                options={exerciseCategories.map((c) => ({ value: c, label: c }))}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <span className="field-label">Exercise</span>
                            <Select
                                showSearch
                                placeholder="Select an exercise…"
                                value={exId}
                                onChange={setExId}
                                options={exInCat}
                                optionFilterProp="label"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {!exercise ? (
                        <div
                            className="mt-4 rounded-xl border border-dashed py-8 text-center text-sm text-text-muted"
                            style={{ borderColor: 'var(--color-border-strong)' }}
                        >
                            Pick an exercise to set sets, reps and rest.
                        </div>
                    ) : (
                        <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="font-bold text-text-primary">{exercise.name}</div>
                                    <span
                                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                        style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                                    >
                                        {exercise.category}
                                    </span>
                                </div>
                                {exercise.youtube && (
                                    <a
                                        href={exercise.youtube}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex shrink-0 items-center gap-1 text-xs font-semibold"
                                        style={{ color: 'var(--color-danger)' }}
                                    >
                                        <PlayCircleOutlined /> Video
                                    </a>
                                )}
                            </div>

                            <Form form={pickForm} layout="vertical" className="mt-4 builder-input">
                                <div className="grid grid-cols-3 gap-x-4">
                                    <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}>
                                        <InputNumber min={1} style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}>
                                        <Input placeholder="8-10" />
                                    </Form.Item>
                                    <Form.Item name="rest" label="Rest">
                                        <Input placeholder="90s" />
                                    </Form.Item>
                                </div>
                                <Form.Item name="notes" label="Instructions" className="mb-0">
                                    <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                                </Form.Item>
                            </Form>
                        </div>
                    )}
                </div>
            ) : (
                <Form form={newForm} layout="vertical" className="mt-4 builder-input">
                    <div className="modal-section">
                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">Exercise</div>
                        <div className="grid grid-cols-2 gap-x-4">
                            <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter a name' }]}>
                                <Input placeholder="e.g. Landmine Press" />
                            </Form.Item>
                            <Form.Item name="category" label="Category" initialValue={exerciseCategories[0]}>
                                <Select options={exerciseCategories.map((c) => ({ value: c, label: c }))} />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-3 gap-x-4">
                            <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}>
                                <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}>
                                <Input placeholder="8-10" />
                            </Form.Item>
                            <Form.Item name="rest" label="Rest">
                                <Input placeholder="90s" />
                            </Form.Item>
                        </div>
                        <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                            <Input placeholder="https://youtube.com/watch?v=…" />
                        </Form.Item>
                        <Form.Item name="notes" label="Instructions" className="mb-0">
                            <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                        </Form.Item>
                    </div>
                    <Form.Item name="saveToLibrary" valuePropName="checked" initialValue={true} className="mb-0 mt-3">
                        <Checkbox>Save to my exercise library for reuse</Checkbox>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    )
}
