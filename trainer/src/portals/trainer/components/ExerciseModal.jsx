import { useMemo, useState, useEffect } from 'react'
import { Modal, Select, Segmented, Form, Input, InputNumber, Checkbox } from 'antd'
import { useLibrary } from '../../../context/LibraryContext'
import { exerciseCategories } from '../../../services/exerciseLibrary'

// Lets a trainer add an exercise to a day either by picking a predefined /
// custom exercise, or by creating a brand-new one. New exercises can be saved
// to the trainer's own library for reuse.
export default function ExerciseModal({ open, onCancel, onAdd }) {
    const { exercises, addExercise } = useLibrary()
    const [mode, setMode] = useState('library')
    const [exId, setExId] = useState(null)
    const [pickForm] = Form.useForm()
    const [newForm] = Form.useForm()

    const exercise = useMemo(() => exercises.find((x) => x.id === exId), [exercises, exId])

    useEffect(() => {
        if (open) {
            setMode('library')
            setExId(null)
            pickForm.resetFields()
            newForm.resetFields()
        }
    }, [open, pickForm, newForm])

    // Prefill set/rep defaults when an exercise is chosen.
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

    const options = exerciseCategories
        .map((cat) => ({
            label: cat,
            title: cat,
            options: exercises
                .filter((x) => x.category === cat)
                .map((x) => ({ value: x.id, label: `${x.name}${x.source === 'trainer' ? ' (custom)' : ''}` })),
        }))
        .filter((g) => g.options.length > 0)

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
                category: v.category || 'Chest',
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
            title="Add exercise"
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText="Add exercise"
            okButtonProps={{ disabled: mode === 'library' && !exercise }}
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
                        { value: 'custom', label: 'Create new' },
                    ]}
                />
            </div>

            {mode === 'library' ? (
                <div className="mt-4">
                    <div className="mb-1 text-xs font-semibold text-text-secondary">Exercise</div>
                    <Select
                        showSearch
                        placeholder="Search exercises…"
                        value={exId}
                        onChange={setExId}
                        options={options}
                        optionFilterProp="label"
                        style={{ width: '100%' }}
                    />
                    {exercise && (
                        <Form form={pickForm} layout="vertical" className="mt-4 builder-input">
                            <div className="grid grid-cols-3 gap-x-4">
                                <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                                <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                                <Form.Item name="rest" label="Rest"><Input placeholder="90s" /></Form.Item>
                            </div>
                            <Form.Item name="notes" label="Instructions">
                                <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                            </Form.Item>
                        </Form>
                    )}
                </div>
            ) : (
                <Form form={newForm} layout="vertical" className="mt-4 builder-input">
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter a name' }]}>
                            <Input placeholder="e.g. Landmine Press" />
                        </Form.Item>
                        <Form.Item name="category" label="Category" initialValue="Chest">
                            <Select options={exerciseCategories.map((c) => ({ value: c, label: c }))} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                        <Form.Item name="rest" label="Rest"><Input placeholder="90s" /></Form.Item>
                    </div>
                    <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                        <Input placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                    <Form.Item name="notes" label="Instructions">
                        <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                    </Form.Item>
                    <Form.Item name="saveToLibrary" valuePropName="checked" initialValue={true} className="mb-0">
                        <Checkbox>Save to my exercise library for reuse</Checkbox>
                    </Form.Item>
                </Form>
            )}
        </Modal>
    )
}
