import { useEffect, useMemo, useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, Tag, App, Skeleton } from 'antd'
import {
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    ArrowLeftOutlined,
    SaveOutlined,
    CalendarOutlined,
    ThunderboltOutlined,
    PlayCircleOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import ModalTitle from '../../../components/common/ModalTitle'
import { confirmDelete } from '../../../utils/confirm'
import { useLibrary } from '../../../context/LibraryContext'
import { exerciseCategories } from '../../../services/exerciseLibrary'
import { mergeCategories } from '../../../hooks/useLibraryCategories'
import { dietGoals } from '../../../services/dietPlans'

// Training days are keyed by weekday name, one workout per weekday — the same
// rule the trainer's Exercise Plans builder applies to a client plan.
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const weekdayRank = (d) => { const i = WEEKDAYS.indexOf(d.day); return i === -1 ? WEEKDAYS.length : i }
const sortByWeekday = (days) => [...days].sort((a, b) => weekdayRank(a) - weekdayRank(b))

let seq = 1
const uid = (p) => `${p}${Date.now()}${seq++}`

const countExercises = (days = []) => days.reduce((n, d) => n + (d.exercises || []).length, 0)

// A stored template -> the editor's day/exercise state (ids kept so a re-save doesn't mint new ones).
const toEditorDays = (plan) =>
    (plan.days || []).map((d) => ({
        ...d,
        id: d._id || d.id,
        exercises: (d.exercises || []).map((e) => ({ ...e, id: e._id || e.id })),
    }))

export default function ExercisePlans() {
    const { message } = App.useApp()
    const { exercisePlans, addExercisePlan, updateExercisePlan, removeExercisePlan, loading, error, reload } = useLibrary(['exercisePlans'])
    const [editingId, setEditingId] = useState(null)

    const editing = exercisePlans.find((p) => (p._id || p.id) === editingId) || null

    const createPlan = async () => {
        try {
            const id = await addExercisePlan({ name: 'New template', goal: dietGoals[0], description: '', days: [] })
            setEditingId(id)
        } catch (err) {
            message.error(err.message || 'Failed to create template')
        }
    }

    const deletePlan = (p) =>
        confirmDelete({
            title: 'Delete template?',
            content: `Remove the "${p.name}" exercise-plan template? Client plans already built from it are not affected.`,
            onOk: async () => {
                try {
                    await removeExercisePlan(p._id || p.id)
                    message.success('Template deleted')
                } catch (err) {
                    message.error(err.message || 'Failed to delete')
                }
            },
        })

    if (editing) {
        return (
            <PlanEditor
                key={editing._id || editing.id}
                plan={editing}
                onSave={async (patch) => {
                    try {
                        await updateExercisePlan(editing._id || editing.id, patch)
                        message.success('Template saved')
                        setEditingId(null)
                    } catch (err) {
                        message.error(err.message || 'Failed to save')
                    }
                }}
                onBack={() => setEditingId(null)}
            />
        )
    }

    return (
        <div>
            <PageHeader title="Exercise Plans" subtitle="Reusable templates trainers apply to a client's exercise plan.">
                <Button type="primary" icon={<PlusOutlined />} onClick={createPlan}>
                    New template
                </Button>
            </PageHeader>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {[0, 1].map((i) => <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 4 }} /></div>)}
                </div>
            ) : error ? (
                <div className="app-card"><SectionError title="Couldn't load exercise-plan templates" error={error} onRetry={reload} /></div>
            ) : exercisePlans.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No templates yet"
                        description="Create a reusable exercise-plan template built from the exercise library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={createPlan}>New template</Button>}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {exercisePlans.map((p) => {
                        const pid = p._id || p.id
                        const days = sortByWeekday(p.days || [])
                        return (
                            <div key={pid} className="app-card flex flex-col p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="font-bold text-text-primary">{p.name}</div>
                                        <Tag bordered={false} style={{ borderRadius: 999, marginTop: 4 }}>{p.goal}</Tag>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button size="small" icon={<EditOutlined />} onClick={() => setEditingId(pid)}>Edit</Button>
                                        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => deletePlan(p)} />
                                    </div>
                                </div>
                                {p.description && <p className="mt-2 mb-0 text-sm text-text-secondary">{p.description}</p>}
                                {days.length > 0 && (
                                    <div className="mt-2 text-xs text-text-muted">
                                        {days.map((d) => `${d.day.slice(0, 3)}${d.focus ? ` · ${d.focus}` : ''}`).join('  |  ')}
                                    </div>
                                )}
                                <div
                                    className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-center"
                                    style={{ borderColor: 'var(--color-border)' }}
                                >
                                    <Stat label="Training days" value={days.length} />
                                    <Stat label="Exercises" value={countExercises(days)} />
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
/* Plan editor                                                        */
/* ------------------------------------------------------------------ */
function PlanEditor({ plan, onSave, onBack }) {
    const { message } = App.useApp()
    const [name, setName] = useState(plan.name)
    const [goal, setGoal] = useState(plan.goal)
    const [description, setDescription] = useState(plan.description || '')
    const [days, setDays] = useState(() => toEditorDays(plan))

    const [dayModal, setDayModal] = useState(null) // { day? } — day being edited, or {} when adding
    const [exModal, setExModal] = useState(null) // { dayId, ex? } — ex = row being edited
    const [dayForm] = Form.useForm()

    const allWeekdaysUsed = WEEKDAYS.every((w) => days.some((d) => d.day === w))

    // One workout per weekday: options already taken by another day are disabled.
    const weekdayOptions = (ownDayId = null) =>
        WEEKDAYS.map((w) => ({ value: w, label: w, disabled: days.some((d) => d.id !== ownDayId && d.day === w) }))

    const openDayModal = (day = null) => {
        dayForm.resetFields()
        if (day) dayForm.setFieldsValue({ day: day.day, focus: day.focus, note: day.note })
        setDayModal({ day })
    }

    const saveDay = async () => {
        const v = await dayForm.validateFields()
        const fields = { day: v.day, focus: v.focus, note: v.note || '' }
        const editingDay = dayModal.day
        setDays((prev) =>
            editingDay
                ? prev.map((d) => (d.id === editingDay.id ? { ...d, ...fields } : d))
                : [...prev, { id: uid('D'), ...fields, exercises: [] }],
        )
        setDayModal(null)
    }

    const removeDay = (id) => setDays((prev) => prev.filter((d) => d.id !== id))

    const saveExercise = (ex) => {
        const { dayId, ex: editingEx } = exModal
        setDays((prev) =>
            prev.map((d) => {
                if (d.id !== dayId) return d
                const exercises = editingEx
                    ? d.exercises.map((e) => (e.id === editingEx.id ? { ...e, ...ex } : e))
                    : [...d.exercises, { id: uid('E'), ...ex }]
                return { ...d, exercises }
            }),
        )
        setExModal(null)
        message.success(editingEx ? 'Exercise updated' : 'Exercise added')
    }

    const removeExercise = (dayId, exId) =>
        setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)))

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

            <PageHeader title="Edit template" subtitle="Built from the exercise library. Trainers copy this into a client's exercise plan.">
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSave({ name: name.trim() || 'Untitled', goal, description: description.trim(), days })}
                >
                    Save template
                </Button>
            </PageHeader>

            <div className="app-card mb-4 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-text-secondary">Template name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push / Pull / Legs" />
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
                    {days.length} {days.length === 1 ? 'training day' : 'training days'} · {countExercises(days)} exercises
                </span>
                <Button className="sm:ml-auto" type="dashed" icon={<PlusOutlined />} disabled={allWeekdaysUsed} onClick={() => openDayModal()}>
                    Add day
                </Button>
            </div>

            {days.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No training days yet"
                        description="Add a day like 'Monday — Chest', then add exercises to it from the library."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={() => openDayModal()}>Add day</Button>}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {sortByWeekday(days).map((d) => (
                        <div key={d.id} className="app-card flex flex-col p-5">
                            <div className="mb-3 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="font-bold text-text-primary">{d.day}</div>
                                    <div className="text-xs text-text-muted">{d.focus}</div>
                                </div>
                                <div className="flex shrink-0 items-center">
                                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openDayModal(d)} aria-label="Edit day" />
                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeDay(d.id)} aria-label="Remove day" />
                                </div>
                            </div>

                            {d.note && (
                                <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                    {d.note}
                                </div>
                            )}

                            {d.exercises.length === 0 ? (
                                <div className="rounded-lg py-6 text-center text-xs text-text-muted" style={{ background: 'var(--color-surface-secondary)' }}>
                                    No exercises yet
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {d.exercises.map((ex) => (
                                        <div key={ex.id} className="rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                            {ex.category && (
                                                <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-primary)' }}>{ex.category}</div>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-sm font-semibold text-text-primary">{ex.name}</span>
                                                <span className="flex shrink-0 items-center">
                                                    {ex.youtube && (
                                                        <Button size="small" type="text" icon={<PlayCircleOutlined />} href={ex.youtube} target="_blank" rel="noopener noreferrer" aria-label="Watch video" />
                                                    )}
                                                    <Button size="small" type="text" icon={<EditOutlined />} onClick={() => setExModal({ dayId: d.id, ex })} aria-label="Edit exercise" />
                                                    <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeExercise(d.id, ex.id)} aria-label="Remove exercise" />
                                                </span>
                                            </div>
                                            <div className="mt-1 text-xs text-text-muted">{ex.sets} sets × {ex.reps} · Rest {ex.rest}</div>
                                            {ex.instructions && <div className="mt-1 text-xs italic text-text-secondary">{ex.instructions}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Button className="mt-3" type="dashed" block icon={<PlusOutlined />} onClick={() => setExModal({ dayId: d.id })}>
                                Add exercise
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title={
                    <ModalTitle
                        icon={<CalendarOutlined />}
                        title={dayModal?.day ? 'Edit training day' : 'Add training day'}
                        subtitle="e.g. Monday — Chest & Triceps"
                    />
                }
                open={!!dayModal}
                onCancel={() => setDayModal(null)}
                onOk={saveDay}
                okText={dayModal?.day ? 'Save changes' : 'Add day'}
                okButtonProps={{ icon: dayModal?.day ? <SaveOutlined /> : <PlusOutlined /> }}
                centered
            >
                <Form form={dayForm} layout="vertical" className="mt-1">
                    <Form.Item name="day" label="Day" rules={[{ required: true, message: 'Pick a day' }]}>
                        <Select placeholder="Select a day" options={weekdayOptions(dayModal?.day?.id)} />
                    </Form.Item>
                    <Form.Item name="focus" label="Focus" rules={[{ required: true, message: 'Enter a focus' }]}>
                        <Input placeholder="e.g. Chest & Triceps" />
                    </Form.Item>
                    <Form.Item name="note" label="Note for client (optional)">
                        <Input.TextArea rows={2} placeholder="e.g. Warm up properly, form over weight" />
                    </Form.Item>
                </Form>
            </Modal>

            <ExercisePickerModal
                open={!!exModal}
                editing={exModal?.ex || null}
                onCancel={() => setExModal(null)}
                onSave={saveExercise}
            />
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Exercise picker: category -> exercise -> sets / reps / rest        */
/* ------------------------------------------------------------------ */
function ExercisePickerModal({ open, editing, onCancel, onSave }) {
    const { exercises } = useLibrary(['exercises'])
    // Built-in categories + any admin-added ones the loaded exercises carry.
    const categories = useMemo(() => mergeCategories(exerciseCategories, exercises.map((x) => x.category)), [exercises])
    const [cat, setCat] = useState(exerciseCategories[0])
    const [exId, setExId] = useState(null)
    const [form] = Form.useForm()

    const exercise = useMemo(() => exercises.find((x) => x.id === exId), [exercises, exId])
    const exInCat = useMemo(
        () => exercises.filter((x) => x.category === cat).map((x) => ({ value: x.id, label: x.name })),
        [exercises, cat],
    )

    useEffect(() => {
        if (!open) return
        setCat(exerciseCategories[0])
        setExId(null)
        form.resetFields()
        if (editing) form.setFieldsValue({ sets: editing.sets, reps: editing.reps, rest: editing.rest, instructions: editing.instructions })
    }, [open, editing, form])

    // Picking a library exercise prefills its default prescription.
    const pickExercise = (id) => {
        setExId(id)
        const x = exercises.find((e) => e.id === id)
        if (x) form.setFieldsValue({ sets: x.defaultSets, reps: x.defaultReps, rest: x.defaultRest, instructions: x.notes })
    }

    const handleOk = async () => {
        if (!editing && !exercise) return
        const v = await form.validateFields()
        const prescription = { sets: v.sets, reps: v.reps, rest: v.rest || '60s', instructions: v.instructions || '' }
        if (editing) {
            onSave(prescription)
            return
        }
        onSave({
            exerciseCode: exercise.code,
            name: exercise.name,
            category: exercise.category || '',
            technique: exercise.technique || 'standard',
            youtube: exercise.youtube || '',
            ...prescription,
        })
    }

    const shown = editing || exercise

    return (
        <Modal
            title={
                <ModalTitle
                    icon={<ThunderboltOutlined />}
                    title={editing ? 'Edit exercise' : 'Add exercise'}
                    subtitle={editing ? editing.name : 'Pick from the library — sets & reps prefill'}
                />
            }
            open={open}
            onCancel={onCancel}
            onOk={handleOk}
            okText={editing ? 'Save changes' : 'Add exercise'}
            okButtonProps={{ icon: editing ? <SaveOutlined /> : <PlusOutlined />, disabled: !shown }}
            centered
            width={560}
        >
            {!editing && (
                <div className="mt-1 grid grid-cols-2 gap-x-4">
                    <div>
                        <span className="field-label">Category</span>
                        <Select
                            value={cat}
                            onChange={(c) => {
                                setCat(c)
                                setExId(null)
                            }}
                            options={categories.map((c) => ({ value: c, label: c }))}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div>
                        <span className="field-label">Exercise</span>
                        <Select
                            showSearch
                            placeholder="Select an exercise…"
                            value={exId}
                            onChange={pickExercise}
                            options={exInCat}
                            optionFilterProp="label"
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            )}

            {!shown && (
                <div
                    className="mt-4 rounded-xl border border-dashed py-8 text-center text-sm text-text-muted"
                    style={{ borderColor: 'var(--color-border-strong)' }}
                >
                    Pick an exercise to set sets, reps and rest.
                </div>
            )}

            {/* The form stays mounted (hidden until an exercise is chosen) so the prefill always lands. */}
            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', display: shown ? undefined : 'none' }}>
                <div className="font-bold text-text-primary">{shown?.name}</div>
                {shown?.category && (
                    <span
                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }}
                    >
                        {shown.category}
                    </span>
                )}
                <Form form={form} layout="vertical" className="mt-4">
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="sets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="reps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                        <Form.Item name="rest" label="Rest"><Input placeholder="90s" /></Form.Item>
                    </div>
                    <Form.Item name="instructions" label="Instructions" className="mb-0">
                        <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    )
}
