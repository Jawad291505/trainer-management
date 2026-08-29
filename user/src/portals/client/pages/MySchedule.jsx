import { useState } from 'react'
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CalendarOutlined,
    PlusOutlined,
    DeleteOutlined,
} from '@ant-design/icons'
import { Button, Modal, Form, Input, Select, TimePicker, DatePicker, App } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import { activityColors } from '../../../services/mockData'
import { useSchedule } from '../../../context/ScheduleContext'

const TYPE_OPTIONS = Object.keys(activityColors).map((k) => ({
    value: k,
    label: k[0].toUpperCase() + k.slice(1),
}))

const WHEN_OPTIONS = [
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
]

export default function MySchedule() {
    const { message } = App.useApp()
    const { today, upcoming, addActivity, removeActivity, toggleDone } = useSchedule()
    const [open, setOpen] = useState(false)
    const [form] = Form.useForm()
    const when = Form.useWatch('when', form)

    const openModal = () => {
        form.setFieldsValue({ title: '', type: 'workout', when: 'today', time: null, date: null })
        setOpen(true)
    }

    const submit = async () => {
        const v = await form.validateFields()
        addActivity({
            when: v.when,
            title: v.title,
            type: v.type,
            time: v.time ? v.time.format('HH:mm') : undefined,
            date: v.date ? v.date.format('ddd, DD MMM') : undefined,
        })
        setOpen(false)
        form.resetFields()
        message.success('Added to your schedule')
    }

    return (
        <div>
            <PageHeader title="My Schedule" subtitle="Your activities for today and what's coming up.">
                <Button type="primary" icon={<PlusOutlined />} onClick={openModal}>
                    Add activity
                </Button>
            </PageHeader>

            {/* Today timeline */}
            <div className="app-card mb-6 p-5">
                <h3 className="section-title mb-4">Today</h3>
                {today.length === 0 ? (
                    <p className="text-sm text-text-muted">Nothing planned yet. Add your first activity.</p>
                ) : (
                    <div className="flex flex-col">
                        {today.map((a, i) => {
                            const last = i === today.length - 1
                            const color = activityColors[a.type] || 'var(--color-primary)'
                            return (
                                <div key={a.id} className="flex gap-4">
                                    <div className="flex w-12 shrink-0 justify-end pt-0.5 text-xs font-bold text-text-primary">{a.time}</div>
                                    <div className="relative flex flex-col items-center">
                                        <span className="z-10 h-3.5 w-3.5 rounded-full" style={{ background: color, boxShadow: '0 0 0 2px var(--color-surface)' }} />
                                        {!last && <span className="w-0.5 flex-1" style={{ background: 'var(--color-border)' }} />}
                                    </div>
                                    <div className={`group flex-1 rounded-xl p-3 ${last ? '' : 'mb-4'}`} style={{ background: 'var(--color-surface-secondary)' }}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-semibold text-text-primary">{a.title}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDone(a.id)}
                                                    className="flex items-center gap-1 text-xs"
                                                    style={{ color: a.done ? 'var(--color-success)' : 'var(--color-text-muted)' }}
                                                >
                                                    {a.done ? <CheckCircleFilled /> : <ClockCircleOutlined />}
                                                    {a.done ? 'Done' : 'Upcoming'}
                                                </button>
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeActivity('today', a.id)}
                                                    className="opacity-0 transition-opacity group-hover:opacity-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Upcoming */}
            <div className="app-card p-5">
                <h3 className="section-title mb-4">Upcoming</h3>
                {upcoming.length === 0 ? (
                    <p className="text-sm text-text-muted">No upcoming activities.</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {upcoming.map((u) => (
                            <div key={u.id} className="group flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--color-surface)', color: activityColors[u.type] || 'var(--color-primary)' }}>
                                    <CalendarOutlined />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-text-primary">{u.title}</div>
                                    <div className="text-xs text-text-muted">{u.date}</div>
                                </div>
                                <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => removeActivity('upcoming', u.id)}
                                    className="opacity-0 transition-opacity group-hover:opacity-100"
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Modal
                title="Add activity"
                open={open}
                onCancel={() => setOpen(false)}
                onOk={submit}
                okText="Add activity"
                centered
            >
                <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Give the activity a title' }]}>
                        <Input placeholder="e.g. Evening walk" autoFocus />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                            <Select options={TYPE_OPTIONS} />
                        </Form.Item>
                        <Form.Item name="when" label="When" rules={[{ required: true }]}>
                            <Select options={WHEN_OPTIONS} />
                        </Form.Item>
                        {when === 'upcoming' ? (
                            <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Pick a date' }]}>
                                <DatePicker className="w-full" format="ddd, DD MMM" />
                            </Form.Item>
                        ) : (
                            <Form.Item name="time" label="Time" rules={[{ required: true, message: 'Pick a time' }]}>
                                <TimePicker className="w-full" format="HH:mm" minuteStep={5} needConfirm={false} />
                            </Form.Item>
                        )}
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
