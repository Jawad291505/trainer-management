import { useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App, Empty } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    SaveOutlined,
    SendOutlined,
    EditOutlined,
    AppstoreOutlined,
    CalendarOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import ModalTitle from '../../../components/common/ModalTitle'
import { clients, sampleExercisePlan } from '../../../services/mockData'
import { useLibrary } from '../../../context/LibraryContext'
import { exerciseCategories } from '../../../services/exerciseLibrary'
import { confirmDelete } from '../../../utils/confirm'
import ExerciseModal from '../components/ExerciseModal'

let daySeq = 100
let exSeq = 100

export default function ExercisePlans() {
    const { message } = App.useApp()
    const { customExercises, updateExercise, removeExercise } = useLibrary()
    const [clientId, setClientId] = useState(sampleExercisePlan.clientId)
    const [days, setDays] = useState(sampleExercisePlan.days)
    const [dayModal, setDayModal] = useState(false)
    const [exModal, setExModal] = useState(null) // dayId
    const [libModal, setLibModal] = useState(false) // My Exercises manager
    const [editing, setEditing] = useState(null) // custom exercise being edited
    const [dayForm] = Form.useForm()
    const [editForm] = Form.useForm()

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

    const addExerciseToDay = (ex) => {
        setDays((prev) =>
            prev.map((d) => (d.id === exModal ? { ...d, exercises: [...d.exercises, { id: `E${exSeq++}`, ...ex }] } : d)),
        )
        setExModal(null)
        message.success('Exercise added')
    }

    const removeExerciseFromDay = (dayId, exId) => {
        setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)))
    }

    // ---- My Exercises manager ----
    const openEdit = (ex) => {
        setEditing(ex)
        editForm.setFieldsValue({
            name: ex.name,
            category: ex.category,
            defaultSets: ex.defaultSets,
            defaultReps: ex.defaultReps,
            defaultRest: ex.defaultRest,
            youtube: ex.youtube,
            notes: ex.notes,
        })
    }

    const saveEdit = async () => {
        const v = await editForm.validateFields()
        updateExercise(editing.id, v)
        setEditing(null)
        message.success('Exercise updated')
    }

    const deleteCustom = (ex) =>
        confirmDelete({
            title: 'Delete exercise?',
            content: `Remove "${ex.name}" from your library?`,
            onOk: () => {
                removeExercise(ex.id)
                message.success('Exercise deleted')
            },
        })

    return (
        <div>
            <PageHeader title="Exercise Plans" subtitle="Organize workouts by training day.">
                <Button icon={<AppstoreOutlined />} onClick={() => setLibModal(true)}>My exercises</Button>
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
                                    <Button size="small" icon={<PlusOutlined />} onClick={() => setExModal(d.id)} />
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
                                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeExerciseFromDay(d.id, ex.id)} />
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

            <Modal
                title={<ModalTitle icon={<CalendarOutlined />} title="Add training day" subtitle="e.g. Monday — Chest & Triceps" />}
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
                    <Form.Item name="focus" label="Focus" rules={[{ required: true, message: 'Enter a focus' }]}>
                        <Input placeholder="e.g. Chest & Triceps" />
                    </Form.Item>
                </Form>
            </Modal>

            <ExerciseModal open={!!exModal} onCancel={() => setExModal(null)} onAdd={addExerciseToDay} />

            {/* My Exercises library manager */}
            <Modal
                title={<ModalTitle icon={<AppstoreOutlined />} title="My exercises" subtitle="Exercises you've created — edit or remove anytime" />}
                open={libModal}
                onCancel={() => setLibModal(false)}
                footer={null}
                centered
                width={560}
            >
                {customExercises.length === 0 ? (
                    <Empty description="No custom exercises yet" className="py-6" />
                ) : (
                    <div className="mt-2 flex flex-col gap-2">
                        {customExercises.map((ex) => (
                            <div key={ex.id} className="flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                <div>
                                    <div className="text-sm font-semibold text-text-primary">{ex.name}</div>
                                    <div className="text-xs text-text-muted">{ex.category} · {ex.defaultSets} × {ex.defaultReps}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(ex)} />
                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deleteCustom(ex)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            {/* Edit custom exercise */}
            <Modal
                title={<ModalTitle icon={<EditOutlined />} title="Edit exercise" subtitle={editing?.name} />}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={saveEdit}
                okText="Save changes"
                okButtonProps={{ icon: <SaveOutlined /> }}
                centered
                width={520}
            >
                <Form form={editForm} layout="vertical" className="mt-1 builder-input">
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter a name' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="category" label="Category">
                            <Select options={exerciseCategories.map((c) => ({ value: c, label: c }))} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="defaultSets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="defaultReps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                        <Form.Item name="defaultRest" label="Rest"><Input placeholder="90s" /></Form.Item>
                    </div>
                    <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                        <Input placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                    <Form.Item name="notes" label="Instructions">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
