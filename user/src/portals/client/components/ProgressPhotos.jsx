import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
    Button,
    Modal,
    DatePicker,
    Select,
    Input,
    Upload,
    Image,
    Tag,
    Popconfirm,
    App,
} from 'antd'
import { CameraOutlined, UploadOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import EmptyState from '../../../components/common/EmptyState'
import { useProgressPhotos } from '../../../context/ProgressPhotosContext'

const progressPhotoAngleLabels = { front: 'Front', side: 'Side', back: 'Back', other: 'Other' }

const ANGLE_OPTIONS = Object.entries(progressPhotoAngleLabels).map(([value, label]) => ({ value, label }))
const DEFAULT_ANGLES = ['front', 'side', 'back']
let rowKey = 0
const makeRow = (angle = 'other') => ({ key: `r${rowKey++}`, file: null, previewUrl: '', angle, caption: '' })

function UploadModal({ open, onClose }) {
    const { message } = App.useApp()
    const { addPhotos } = useProgressPhotos()
    const [date, setDate] = useState(dayjs())
    const [rows, setRows] = useState(() => DEFAULT_ANGLES.map(makeRow))
    const [saving, setSaving] = useState(false)
    const rowsRef = useRef(rows)
    rowsRef.current = rows

    useEffect(() => {
        if (open) {
            setDate(dayjs())
            setRows((prev) => {
                prev.forEach((r) => r.previewUrl && URL.revokeObjectURL(r.previewUrl))
                return DEFAULT_ANGLES.map(makeRow)
            })
        }
    }, [open])

    // Release any object URLs still held when the modal unmounts.
    useEffect(
        () => () => rowsRef.current.forEach((r) => r.previewUrl && URL.revokeObjectURL(r.previewUrl)),
        [],
    )

    const patchRow = (key, patch) =>
        setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))

    const pickFile = (key, file) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.key !== key) return r
                if (r.previewUrl) URL.revokeObjectURL(r.previewUrl)
                return { ...r, file, previewUrl: URL.createObjectURL(file) }
            }),
        )
    }

    const removeRow = (key) =>
        setRows((prev) => {
            const target = prev.find((r) => r.key === key)
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
            return prev.filter((r) => r.key !== key)
        })

    const submit = async () => {
        const ready = rows.filter((r) => r.file)
        if (!ready.length) {
            message.warning('Add at least one photo.')
            return
        }
        setSaving(true)
        try {
            const count = await addPhotos(ready, { date: date.format('YYYY-MM-DD') })
            message.success(`${count} photo${count === 1 ? '' : 's'} added to your progress.`)
            onClose()
        } catch (err) {
            message.error(err.message || 'Could not add those photos.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title="Add progress photos"
            open={open}
            onCancel={onClose}
            onOk={submit}
            okText="Add to progress"
            confirmLoading={saving}
            centered
            width={560}
        >
            <p className="mt-0 mb-3 text-sm text-text-secondary">
                Your trainer will see these and can leave a note under each one.
            </p>

            <label className="mb-1 block text-sm font-medium text-text-secondary">Date</label>
            <DatePicker
                value={date}
                onChange={(d) => d && setDate(d)}
                allowClear={false}
                disabledDate={(d) => d.isAfter(dayjs(), 'day')}
                className="mb-4 w-full"
            />

            <div className="flex flex-col gap-3">
                {rows.map((row) => (
                    <div
                        key={row.key}
                        className="rounded-xl p-3"
                        style={{ background: 'var(--color-surface-secondary)' }}
                    >
                        <div className="flex items-start gap-3">
                            {row.previewUrl ? (
                                <img
                                    src={row.previewUrl}
                                    alt=""
                                    className="h-20 w-16 shrink-0 rounded-lg object-cover"
                                />
                            ) : (
                                <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg text-xl text-text-muted" style={{ background: 'var(--color-surface)' }}>
                                    <CameraOutlined />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <Select
                                        size="small"
                                        value={row.angle}
                                        onChange={(v) => patchRow(row.key, { angle: v })}
                                        options={ANGLE_OPTIONS}
                                        style={{ width: 110 }}
                                    />
                                    <Upload
                                        accept="image/*"
                                        maxCount={1}
                                        showUploadList={false}
                                        beforeUpload={(file) => {
                                            pickFile(row.key, file)
                                            return false
                                        }}
                                    >
                                        <Button size="small" icon={<UploadOutlined />}>
                                            {row.file ? 'Change' : 'Choose photo'}
                                        </Button>
                                    </Upload>
                                    {rows.length > 1 && (
                                        <Button
                                            size="small"
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => removeRow(row.key)}
                                        />
                                    )}
                                </div>
                                <Input
                                    size="small"
                                    className="mt-2"
                                    placeholder="Caption (optional)"
                                    value={row.caption}
                                    onChange={(e) => patchRow(row.key, { caption: e.target.value })}
                                    maxLength={140}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                type="dashed"
                icon={<PlusOutlined />}
                className="mt-3 w-full"
                onClick={() => setRows((prev) => [...prev, makeRow()])}
            >
                Add another angle
            </Button>
        </Modal>
    )
}

function CaptionEditor({ photo }) {
    const { updateCaption } = useProgressPhotos()
    const [open, setOpen] = useState(false)
    const [text, setText] = useState(photo.caption || '')

    return (
        <>
            <button
                className="text-xs font-semibold text-primary"
                onClick={() => {
                    setText(photo.caption || '')
                    setOpen(true)
                }}
            >
                {photo.caption ? 'Edit caption' : 'Add caption'}
            </button>
            <Modal
                title="Caption"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={() => {
                    updateCaption(photo.id, text)
                    setOpen(false)
                }}
                okText="Save"
                centered
            >
                <Input.TextArea
                    rows={3}
                    value={text}
                    maxLength={140}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What's this photo about?"
                />
            </Modal>
        </>
    )
}

export default function ProgressPhotos() {
    const { message } = App.useApp()
    const { photosByDate, removePhoto } = useProgressPhotos()
    const [uploadOpen, setUploadOpen] = useState(false)

    const total = useMemo(
        () => photosByDate.reduce((n, g) => n + g.items.length, 0),
        [photosByDate],
    )

    return (
        <div className="app-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="section-title m-0">Progress Photos</h3>
                    <p className="mt-1 mb-0 text-sm text-text-secondary">
                        {total > 0
                            ? 'Tap a photo to view it full size. Your trainer’s notes appear underneath.'
                            : 'Upload photos each day so your trainer can track your changes.'}
                    </p>
                </div>
                <Button type="primary" icon={<CameraOutlined />} onClick={() => setUploadOpen(true)}>
                    Add photos
                </Button>
            </div>

            {total === 0 ? (
                <EmptyState
                    icon={<CameraOutlined />}
                    title="No photos yet"
                    description="Use “Add photos” to upload your first progress shots."
                />
            ) : (
                <div className="flex flex-col gap-6">
                    {photosByDate.map((group) => (
                        <div key={group.date}>
                            <div className="mb-2 text-sm font-semibold text-text-secondary">
                                {dayjs(group.date).format('ddd, D MMM YYYY')}
                            </div>
                            <Image.PreviewGroup>
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                                    {group.items.map((p) => (
                                        <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
                                            <div className="relative bg-black/5" style={{ aspectRatio: '3 / 4' }}>
                                                <Image
                                                    src={p.dataUrl}
                                                    alt={progressPhotoAngleLabels[p.angle] || 'Progress photo'}
                                                    wrapperClassName="!block h-full w-full"
                                                    className="!h-full !w-full !object-cover"
                                                />
                                            </div>
                                            <div className="flex flex-col gap-2 p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Tag bordered={false} style={{ borderRadius: 999 }}>
                                                        {progressPhotoAngleLabels[p.angle] || p.angle}
                                                    </Tag>
                                                    <Popconfirm
                                                        title="Delete this photo?"
                                                        okText="Delete"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() => {
                                                            removePhoto(p.id)
                                                            message.success('Photo deleted')
                                                        }}
                                                    >
                                                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                                                    </Popconfirm>
                                                </div>
                                                {p.caption && (
                                                    <p className="m-0 text-sm text-text-secondary">{p.caption}</p>
                                                )}
                                                <CaptionEditor photo={p} />
                                                {p.note ? (
                                                    <div
                                                        className="rounded-lg px-3 py-2 text-sm"
                                                        style={{ background: 'var(--color-surface-secondary)' }}
                                                    >
                                                        <span className="font-semibold text-text-secondary">Trainer’s note: </span>
                                                        <span className="text-text-secondary">{p.note}</span>
                                                        {p.noteAt && (
                                                            <span className="mt-1 block text-xs text-text-muted">
                                                                {dayjs(p.noteAt).format('D MMM YYYY')}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="m-0 text-xs italic text-text-muted">
                                                        Awaiting trainer feedback
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Image.PreviewGroup>
                        </div>
                    ))}
                </div>
            )}

            <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
        </div>
    )
}
