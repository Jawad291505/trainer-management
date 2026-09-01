import { useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    SaveOutlined,
    SendOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import TagSelect from '../../../components/common/TagSelect'
import { clients, sampleExercisePlan } from '../../../services/mockData'
import { exerciseCategories, getExercisesByCategory } from '../../../services/masterData'

let daySeq = 100
let exSeq = 100

export default function ExercisePlans() {
    const { message } = App.useApp()
    const [clientId, setClientId] = useState(sampleExercisePlan.clientId)
    const [days, setDays] = useState(sampleExercisePlan.days)
    const [dayModal, setDayModal] = useState(false)
    const [exModal, setExModal] = useState(null) // dayId
    const [dayForm] = Form.useForm()
    const [exForm] = Form.useForm()
    const [exCat, setExCat] = useState(exerciseCategories[0])

    const addDay = async () => {
        const v = await dayForm.validateFields()
        setDays((prev) => [...prev, { id: `D${daySeq++}`, day: v.day, focus: v.focus, exercises: [] }])
        dayForm.resetFields()
        setDayModal(false)
        message.success('Day added')
    }

    const removeDay = (id) => {
        setDays((prev) => prev.filter((d) => d.id !== id))
        message.success('Day removed')
    }

    const openExModal = (dayId) => {
        exForm.resetFields()
        setExCat(exerciseCategories[0])
        setExModal(dayId)
    }

    // Picking a library exercise pre-fills the form (name, cues, video, defaults).
    const pickLibraryExercise = (name) => {
        const ex = getExercisesByCategory(exCat).find((x) => x.name === name)
        if (ex) {
            exForm.setFieldsValue({
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.rest && ex.rest !== '-' ? ex.rest : '60s',
                youtube: ex.video || '',
                notes: ex.description || '',
            })
        }
    }

    const addExercise = async () => {
        const v = await exForm.validateFields()
        setDays((prev) =>
            prev.map((d) =>
                d.id === exModal
                    ? { ...d, exercises: [...d.exercises, { id: `E${exSeq++}`, name: v.name, sets: v.sets, reps: v.reps, rest: v.rest || '60s', youtube: v.youtube || '', notes: v.notes || '' }] }
                    : d,
            ),
        )
        exForm.resetFields()
        setExModal(null)
        message.success('Exercise added')
    }

    const removeExercise = (dayId, exId) => {
        setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)))
    }

    return (
        <div>
            <PageHeader title="Exercise Plans" subtitle="Organize workouts by training day.">
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
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} onClick={() => setDayModal(true)}>
                    Add day
                </Button>
            </div>

            <div className="app-card mb-4 p-4 text-xs text-text-muted">
                Add exercises from the master <span className="font-semibold text-text-secondary">Library</span> —
                pick a category, then an exercise — or type a custom one. Sets, reps and cues pre-fill and stay editable.
            </div>

            {days.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No training days yet"
                        description="Add a day like 'Monday — Chest' to begin."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={() => setDayModal(true)}>Add day</Button>}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {days.map((d) => (
                        <div key={d.id} className="app-card flex flex-col p-5">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-text-primary">{d.day}</div>
                                    <div className="text-xs text-text-muted">{d.focus}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="small" icon={<PlusOutlined />} onClick={() => openExModal(d.id)} />
                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeDay(d.id)} />
                                </div>
                            </div>

                            {d.exercises.length === 0 ? (
                                <div className="rounded-lg py-6 text-center text-xs text-text-muted" style={{ background: 'var(--color-surface-secondary)' }}>
                                    No exercises yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {d.exercises.map((ex) => (
                                        <div key={ex.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-semibold text-text-primary">{ex.name}</span>
                                                <div className="flex items-center gap-2">
                                                    {ex.youtube && (
                                                        <a href={ex.youtube} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                                                            <PlayCircleOutlined />
                                                        </a>
                                                    )}
                                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeExercise(d.id, ex.id)} />
                                                </div>
                                            </div>
                                            <div className="mt-1 text-xs text-text-muted">{ex.sets} sets × {ex.reps} · Rest {ex.rest}</div>
                                            {ex.notes && <div className="mt-1 text-xs italic text-text-secondary">{ex.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Modal title="Add training day" open={dayModal} onCancel={() => setDayModal(false)} onOk={addDay} okText="Add day" centered>
                <Form form={dayForm} layout="vertical" className="mt-4">
                    <Form.Item name="day" label="Day" rules={[{ required: true, message: 'Enter a day' }]}>
                        <Input placeholder="e.g. Monday" />
                    </Form.Item>
                    <Form.Item name="focus" label="Focus" rules={[{ required: true, message: 'Enter a focus' }]}>
                        <Input placeholder="e.g. Chest & Triceps" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="Add exercise" open={!!exModal} onCancel={() => setExModal(null)} onOk={addExercise} okText="Add exercise" centered>
                <div className="mt-4 grid grid-cols-2 gap-x-4">
                    <div className="mb-3">
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Library category</label>
                        <TagSelect
                            value={exCat}
                            onChange={(c) => setExCat(c || exerciseCategories[0])}
                            options={exerciseCategories}
                            style={{ width: '100%' }}
                            placeholder="Pick a muscle group, or type your own"
                        />
                    </div>
                    <div className="mb-3">
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Library exercise</label>
                        <Select
                            placeholder="Pick to pre-fill"
                            style={{ width: '100%' }}
                            onChange={pickLibraryExercise}
                            options={getExercisesByCategory(exCat).map((e) => ({ value: e.name, label: e.name }))}
                        />
                    </div>
                </div>
                <Form form={exForm} layout="vertical" className="builder-input">
                    <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter an exercise' }]}>
                        <Input placeholder="e.g. Bench Press" />
                    </Form.Item>
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} /></Form.Item>
                        <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                        <Form.Item name="rest" label="Rest"><Input placeholder="90s" /></Form.Item>
                    </div>
                    <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                        <Input placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                    <Form.Item name="notes" label="Instructions">
                        <Input.TextArea rows={3} placeholder="Form cues, tempo, etc." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
