import { useState } from 'react'
import { Segmented, Button, Modal, Form, Input, Select, TimePicker, App } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../../../components/common/PageHeader'
import ScheduleTimeline from '../components/ScheduleTimeline'
import { activityTypes, clients } from '../../../services/mockData'
import { useSchedule, WEEK_DAYS } from '../../../context/ScheduleContext'

const DAY_OPTIONS = [
    { value: 'today', label: 'Today' },
    ...WEEK_DAYS.map((d) => ({ value: d, label: d })),
]

const TYPE_OPTIONS = Object.entries(activityTypes).map(([value, t]) => ({ value, label: t.label }))

export default function Schedule() {
    const { message } = App.useApp()
    const [view, setView] = useState('day')
    const [open, setOpen] = useState(false)
    const [form] = Form.useForm()
    const { today, week, addActivity, removeActivity } = useSchedule()

    const openModal = () => {
        form.setFieldsValue({ type: 'workout', day: 'today', time: null, title: '', clientId: undefined, notes: '' })
        setOpen(true)
    }

    const submit = async () => {
        const v = await form.validateFields()
        addActivity({
            day: v.day,
            time: v.time.format('HH:mm'),
            title: v.title,
            type: v.type,
            clientId: v.clientId,
            notes: v.notes,
        })
        setOpen(false)
        form.resetFields()
        setView(v.day === 'today' ? 'day' : 'week')
        message.success('Activity added to your schedule')
    }

    return (
        <div>
            <PageHeader title="Schedule" subtitle="Plan and track your sessions.">
                <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
                    New activity
                </Button>
            </PageHeader>

            <div className="mb-4 flex items-center justify-between">
                <Segmented
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]}
                />
                {/* Legend */}
                <div className="hidden flex-wrap items-center gap-3 sm:flex">
                    {Object.entries(activityTypes).map(([key, t]) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                            {t.label}
                        </span>
                    ))}
                </div>
            </div>

            {view === 'day' ? (
                <div className="app-card p-5 md:p-6">
                    <div className="mb-4 text-sm font-bold text-text-primary">Thursday, 27 August 2026</div>
                    <ScheduleTimeline items={today} onRemove={(id) => removeActivity('today', id)} />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                    {WEEK_DAYS.map((d) => (
                        <div key={d} className="app-card flex flex-col p-3">
                            <div className="mb-2 border-b pb-2 text-center text-sm font-bold text-text-primary" style={{ borderColor: 'var(--color-border)' }}>
                                {d}
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                                {week[d].length === 0 ? (
                                    <div className="py-4 text-center text-xs text-text-muted">Rest day</div>
                                ) : (
                                    week[d].map((e) => (
                                        <div
                                            key={e.id}
                                            className="group relative rounded-lg p-2 text-xs"
                                            style={{ background: 'var(--color-surface-secondary)', borderLeft: `3px solid ${activityTypes[e.type].color}` }}
                                        >
                                            <div className="font-bold text-text-primary">{e.time}</div>
                                            <div className="text-text-secondary">{e.title}</div>
                                            <Button
                                                size="small"
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => removeActivity(d, e.id)}
                                                className="!absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                                            />
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title="New activity"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={submit}
                okText="Add activity"
                centered
            >
                <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Give the activity a title' }]}>
                        <Input placeholder="e.g. Strength session" autoFocus />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                            <Select options={TYPE_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="day" label="Day" rules={[{ required: true }]}>
                            <Select options={DAY_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="time" label="Time" rules={[{ required: true, message: 'Pick a time' }]}>
                            <TimePicker className="w-full" format="HH:mm" minuteStep={5} needConfirm={false} />
                        </Form.Item>
                        <Form.Item name="clientId" label="Client">
                            <Select
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                placeholder="Optional"
                                options={clients.map((c) => ({ value: c.id, label: c.name }))}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea rows={2} placeholder="Optional details for this session" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
