import { useEffect, useState } from 'react'
import { Modal, Select, Input, Checkbox, Button } from 'antd'
import { LinkOutlined, ArrowUpOutlined, ArrowDownOutlined, SaveOutlined } from '@ant-design/icons'
import ModalTitle from '../../../components/common/ModalTitle'
import { LINK_TYPES, getLinkType, newLinkKey } from '../../../utils/exerciseLinks'
import TechniquePicker from './TechniquePicker'

// Link two or more exercises of one training day (superset, paired movements,
// a technique sequence), or edit an existing group: its relationship, members,
// order, note and group-level techniques.
//
//   target: { day, link? , startWith? }  — `link` to edit a group, `startWith`
//           (an exercise id) to pre-tick the exercise the trainer started from.
//   onSave(link, memberIds)              — memberIds in performing order.
export default function LinkExercisesModal({ target, onCancel, onSave }) {
    const day = target?.day
    const [type, setType] = useState('superset')
    const [note, setNote] = useState('')
    const [techniques, setTechniques] = useState([])
    const [order, setOrder] = useState([]) // selected exercise ids, in performing order
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (!target) return
        const { link, startWith } = target
        setType(link?.type || 'superset')
        setNote(link?.note || '')
        setTechniques(link?.techniques || [])
        setOrder(link ? target.day.exercises.filter((e) => e.linkKey === link.key).map((e) => e.id) : startWith ? [startWith] : [])
        setTouched(false)
    }, [target])

    if (!day) return null

    const editingKey = target.link?.key
    const byId = new Map(day.exercises.map((e) => [e.id, e]))
    const otherGroup = (ex) => (ex.linkKey && ex.linkKey !== editingKey ? (day.links || []).find((l) => l.key === ex.linkKey) : null)

    const toggle = (id, on) => setOrder((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
    const move = (index, delta) =>
        setOrder((prev) => {
            const next = [...prev]
            const [item] = next.splice(index, 1)
            next.splice(index + delta, 0, item)
            return next
        })

    const tooFew = order.length < 2
    const save = () => {
        setTouched(true)
        if (tooFew) return
        onSave({ key: editingKey || newLinkKey(), type, note: note.trim(), techniques }, order)
    }

    return (
        <Modal
            title={
                <ModalTitle
                    icon={<LinkOutlined />}
                    title={editingKey ? 'Edit linked exercises' : 'Link exercises'}
                    subtitle={`${day.day}${day.focus ? ` — ${day.focus}` : ''}`}
                />
            }
            open
            onCancel={onCancel}
            onOk={save}
            okText={editingKey ? 'Save link' : 'Link exercises'}
            okButtonProps={{ icon: editingKey ? <SaveOutlined /> : <LinkOutlined /> }}
            centered
            width={560}
        >
            <div className="mt-4 builder-input">
                <span className="field-label">Relationship</span>
                <Select
                    value={type}
                    onChange={setType}
                    options={LINK_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    style={{ width: '100%' }}
                />
                <div className="mt-1 text-xs text-text-muted">{getLinkType(type).hint}</div>

                <span className="field-label mt-4">Exercises in this group</span>
                <div className="flex flex-col gap-1.5">
                    {day.exercises.map((ex) => {
                        const other = otherGroup(ex)
                        return (
                            <label key={ex.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                                <Checkbox checked={order.includes(ex.id)} onChange={(e) => toggle(ex.id, e.target.checked)} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-text-primary">{ex.name}</span>
                                    {other && (
                                        <span className="block text-[11px] text-text-muted">
                                            In another {getLinkType(other.type).label.toLowerCase()} — ticking it moves it here
                                        </span>
                                    )}
                                </span>
                            </label>
                        )
                    })}
                </div>
                {touched && tooFew && (
                    <div className="mt-1 text-xs" style={{ color: 'var(--color-danger)' }}>Pick at least two exercises to link.</div>
                )}

                {order.length > 1 && (
                    <>
                        <span className="field-label mt-4">Order</span>
                        <div className="flex flex-col gap-1.5">
                            {order.map((id, i) => (
                                <div key={id} className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--color-border)' }}>
                                    <span
                                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                                        style={{ background: 'var(--color-primary)', color: '#fff' }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">{byId.get(id)?.name}</span>
                                    <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" />
                                    <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === order.length - 1} onClick={() => move(i, 1)} aria-label="Move down" />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <span className="field-label mt-4">Note for the client (optional)</span>
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. No rest between the two, 90s after the pair" />

                <span className="field-label mt-4">Techniques for the whole group (optional)</span>
                <TechniquePicker value={techniques} onChange={setTechniques} placeholder="Search techniques to attach to this group…" />
            </div>
        </Modal>
    )
}
