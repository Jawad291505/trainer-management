import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select, Button, Modal, Form, Input, InputNumber, App, Empty, Spin } from 'antd'
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
import { api } from '../../../services/api'
import { useLibrary } from '../../../context/LibraryContext'
import SectionError from '../../../components/feedback/SectionError'
import { useClientList } from '../../../hooks/useClientList'
import { exerciseCategories } from '../../../services/exerciseLibrary'
import { confirmDelete } from '../../../utils/confirm'
import ExerciseModal from '../components/ExerciseModal'
import TechniqueField from '../components/TechniqueField'
import TechniqueTag from '../components/TechniqueTag'

let daySeq = 100
let exSeq = 100

export default function ExercisePlans() {
    const { message } = App.useApp()
    const { exercises: customExercises, updateExercise, removeExercise } = useLibrary(['exercises'])
    // ?client=<id> pre-selects the client (used by the Requests page's "Open plan").
    const [searchParams] = useSearchParams()
    const [clientId, setClientId] = useState(() => searchParams.get('client'))
    const { clients: clientList, loading: clientsLoading, error: clientsError, reload: reloadClients } = useClientList()
    const [days, setDays] = useState([])
    const [planId, setPlanId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [loading, setLoading] = useState(true)
    const [planError, setPlanError] = useState(null)
    const [planTick, setPlanTick] = useState(0)

    // Default to the first client once the roster arrives (or if the ?client= one isn't theirs).
    useEffect(() => {
        if (clientsLoading) return
        if (clientList.length > 0) setClientId((cur) => (clientList.some((c) => c.id === cur) ? cur : clientList[0].id))
        else setLoading(false) // no clients — nothing to load a plan for
    }, [clientsLoading, clientList])

    // Load existing exercise plan for selected client
    useEffect(() => {
        if (!clientId) return
        setLoading(true)
        setPlanError(null)
        setPlanId(null)
        setDays([])
        api.get(`/exercise-plans?client=${clientId}&summary=1`).then(async (res) => {
            const plans = res.items || []
            const plan = plans.find((p) => p.status === 'draft') || plans[0]
            if (!plan) return
            const full = await api.get(`/exercise-plans/${plan._id || plan.id}`)
            setPlanId(full._id || full.id)
            const loaded = (full.days || []).map((d, di) => ({
                id: d._id || `D${di}`,
                day: d.day,
                focus: d.focus || '',
                note: d.note || '',
                exercises: (d.exercises || []).map((ex) => ({
                    id: ex._id || ex.id,
                    exerciseId: ex.exercise,
                    exerciseCode: ex.exerciseCode,
                    name: ex.name,
                    sets: ex.sets,
                    reps: ex.reps,
                    rest: ex.rest || '60s',
                    technique: ex.technique || 'standard',
                    youtube: ex.youtube || '',
                    notes: ex.instructions || '',
                    trackingType: ex.trackingType || 'reps',
                    targetWeight: ex.targetWeight ?? null,
                    targetDuration: ex.targetDuration ?? null,
                })),
            }))
            setDays(loaded)
        }).catch((err) => setPlanError(err)).finally(() => setLoading(false))
    }, [clientId, planTick])
    const [dayModal, setDayModal] = useState(false)
    const [exModal, setExModal] = useState(null) // dayId
    const [libModal, setLibModal] = useState(false) // My Exercises manager
    const [editing, setEditing] = useState(null) // custom exercise being edited
    const [dayForm] = Form.useForm()
    const [editForm] = Form.useForm()

    const addDay = async () => {
        const v = await dayForm.validateFields()
        setDays((prev) => [...prev, { id: `D${daySeq++}`, day: v.day, focus: v.focus, note: v.note || '', exercises: [] }])
        dayForm.resetFields()
        setDayModal(false)
        message.success('Day added')
    }

    const [noteEditing, setNoteEditing] = useState(null) // dayId being edited
    const [noteDraft, setNoteDraft] = useState('')

    const openNoteEdit = (day) => {
        setNoteEditing(day.id)
        setNoteDraft(day.note || '')
    }

    const saveNote = () => {
        setDays((prev) => prev.map((d) => (d.id === noteEditing ? { ...d, note: noteDraft } : d)))
        setNoteEditing(null)
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
            technique: ex.technique || 'standard',
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

    const buildDaysPayload = () =>
        days.map((d) => ({
            day: d.day,
            focus: d.focus,
            note: d.note || '',
            exercises: d.exercises.map((ex) => ({
                exerciseCode: ex.exerciseCode || undefined,
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest: ex.rest || '60s',
                technique: ex.technique || 'standard',
                youtube: ex.youtube || '',
                instructions: ex.notes || '',
                trackingType: ex.trackingType || 'reps',
                targetWeight: ex.targetWeight ?? null,
                targetDuration: ex.targetDuration ?? null,
            })),
        }))

    const saveDraft = async () => {
        if (!clientId) { message.warning('Select a client first'); return }
        if (days.length === 0) { message.warning('Add at least one training day'); return }
        setSaving(true)
        try {
            if (planId) {
                await api.patch(`/exercise-plans/${planId}`, { days: buildDaysPayload() })
            } else {
                const plan = await api.post('/exercise-plans', {
                    clientId,
                    title: 'Exercise Plan',
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
        if (days.length === 0) { message.warning('Add at least one training day'); return }
        setPublishing(true)
        try {
            let id = planId
            if (!id) {
                const plan = await api.post('/exercise-plans', {
                    clientId,
                    title: 'Exercise Plan',
                    days: buildDaysPayload(),
                })
                id = plan._id || plan.id
                setPlanId(id)
            } else {
                await api.patch(`/exercise-plans/${id}`, { days: buildDaysPayload() })
            }
            await api.post(`/exercise-plans/${id}/publish`)
            message.success('Plan published to client')
        } catch (err) {
            message.error(err.message || 'Failed to publish plan')
        } finally {
            setPublishing(false)
        }
    }

    return (
        <div>
            <PageHeader title="Exercise Plans" subtitle="Organize workouts by training day.">
                <Button icon={<AppstoreOutlined />} onClick={() => setLibModal(true)}>My exercises</Button>
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
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} onClick={() => setDayModal(true)}>
                    Add day
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16"><Spin size="large" /></div>
            ) : clientsError ? (
                <div className="app-card"><SectionError title="Couldn't load your clients" error={clientsError} onRetry={reloadClients} /></div>
            ) : planError ? (
                <div className="app-card"><SectionError title="Couldn't load this client's exercise plan" error={planError} onRetry={() => setPlanTick((t) => t + 1)} /></div>
            ) : days.length === 0 ? (
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

                            <button
                                type="button"
                                onClick={() => openNoteEdit(d)}
                                className="mb-3 w-full rounded-lg px-3 py-2 text-left text-xs"
                                style={{
                                    background: d.note ? 'var(--color-warning-soft)' : 'var(--color-surface-secondary)',
                                    color: d.note ? 'var(--color-warning)' : 'var(--color-text-muted)',
                                }}
                            >
                                {d.note || '+ Add a note for the client (e.g. go light on shoulders)'}
                            </button>

                            {d.exercises.length === 0 ? (
                                <div className="rounded-lg py-6 text-center text-xs text-text-muted" style={{ background: 'var(--color-surface-secondary)' }}>
                                    No exercises yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {d.exercises.map((ex) => (
                                        <div key={ex.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                            <div className="flex items-center justify-between">
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="truncate text-sm font-semibold text-text-primary">{ex.name}</span>
                                                    <TechniqueTag technique={ex.technique} />
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {ex.youtube && (
                                                        <a href={ex.youtube} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                                                            <PlayCircleOutlined />
                                                        </a>
                                                    )}
                                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeExerciseFromDay(d.id, ex.id)} />
                                                </div>
                                            </div>
                                            <div className="mt-1 text-xs text-text-muted">
                                                {ex.sets} sets × {ex.trackingType === 'duration' ? `${ex.targetDuration || ex.reps}s` : ex.reps} · Rest {ex.rest}
                                                {ex.targetWeight ? ` · ${ex.targetWeight}kg` : ''}
                                            </div>
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
                    <Form.Item name="note" label="Note for client (optional)">
                        <Input.TextArea rows={2} placeholder="e.g. Go light on the shoulder today, form over weight" />
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
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-text-primary">{ex.name}</span>
                                        <TechniqueTag technique={ex.technique} />
                                    </div>
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
                    <TechniqueField form={editForm} />
                    <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                        <Input placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                    <Form.Item name="notes" label="Instructions">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Per-day note for the client */}
            <Modal
                title={<ModalTitle icon={<CalendarOutlined />} title="Note for client" subtitle="Shown at the top of this day's workout" />}
                open={!!noteEditing}
                onCancel={() => setNoteEditing(null)}
                onOk={saveNote}
                okText="Save note"
                centered
            >
                <Input.TextArea
                    rows={3}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="e.g. Go light on the shoulder today, form over weight"
                />
            </Modal>
        </div>
    )
}
