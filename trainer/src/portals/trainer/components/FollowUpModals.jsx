import { useState } from 'react'
import { Modal, Form, Select, DatePicker, TimePicker, Input, Checkbox, App } from 'antd'
import dayjs from 'dayjs'
import { api } from '../../../services/api'
import { FOLLOWUP_TYPE_OPTIONS, NEXT_FOLLOWUP_DAYS } from '../../../constants/followUp'

const toPayload = (v) => ({
    date: v.date.format('YYYY-MM-DD'),
    time: v.time ? v.time.format('HH:mm') : '',
    type: v.type,
    note: v.note || '',
    privateNote: v.privateNote || '',
})

// Schedule a new follow-up, or (when `followUp` is passed) edit / reschedule one.
// `initialClientId` pre-selects the client when opened from a client profile.
export function ScheduleFollowUpModal({ open, followUp, initialClientId, clients, clientsLoading = false, onClose, onSaved }) {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const editing = !!followUp

    const initialValues = editing
        ? {
            clientId: followUp.clientId,
            date: dayjs(followUp.date),
            time: followUp.time ? dayjs(followUp.time, 'HH:mm') : null,
            type: followUp.type,
            note: followUp.note,
            privateNote: followUp.privateNote,
        }
        : {
            clientId: initialClientId,
            date: dayjs().add(1, 'day'),
            time: null,
            type: 'check-in',
            note: 'Weekly progress review',
            privateNote: '',
        }

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            const saved = editing
                ? await api.patch(`/followups/${followUp.id}`, toPayload(v))
                : await api.post('/followups', { clientId: v.clientId, ...toPayload(v) })
            message.success(editing ? 'Follow-up updated' : 'Follow-up scheduled')
            onSaved(saved)
        } catch (err) {
            message.error(err.message || 'Could not save follow-up')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title={editing ? 'Edit follow-up' : 'New follow-up'}
            open={open}
            onCancel={onClose}
            onOk={submit}
            okText={editing ? 'Save' : 'Schedule'}
            okButtonProps={{ loading: saving }}
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4" requiredMark={false} initialValues={initialValues} preserve={false}>
                <Form.Item name="clientId" label="Client" rules={[{ required: true, message: 'Pick a client' }]}>
                    <Select
                        showSearch
                        disabled={editing}
                        optionFilterProp="label"
                        placeholder="Select a client"
                        loading={clientsLoading}
                        options={clients.map((c) => ({ value: c.id, label: c.name }))}
                    />
                </Form.Item>
                <div className="grid grid-cols-2 gap-3">
                    <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Pick a date' }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                    <Form.Item name="time" label="Time (optional)">
                        <TimePicker className="w-full" use12Hours format="h:mm A" minuteStep={5} needConfirm={false} />
                    </Form.Item>
                </div>
                <Form.Item name="type" label="Type">
                    <Select options={FOLLOWUP_TYPE_OPTIONS} />
                </Form.Item>
                <Form.Item name="note" label="Agenda" extra="Visible to the client.">
                    <Input.TextArea rows={2} placeholder="What is this check-in about?" />
                </Form.Item>
                <Form.Item name="privateNote" label="Private note" extra="Only you can see this.">
                    <Input.TextArea rows={2} placeholder="Reminders for yourself" />
                </Form.Item>
            </Form>
        </Modal>
    )
}

// Mark a follow-up completed: capture the outcome (shared with the client) and
// optionally book the next one in the same step.
export function CompleteFollowUpModal({ open, followUp, onClose, onDone }) {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const scheduleNext = Form.useWatch('scheduleNext', form)

    const submit = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            const completed = await api.patch(`/followups/${followUp.id}`, { status: 'completed', outcome: v.outcome || '' })
            let next = null
            if (v.scheduleNext) {
                next = await api.post('/followups', {
                    clientId: followUp.clientId,
                    date: v.nextDate.format('YYYY-MM-DD'),
                    time: followUp.time,
                    type: followUp.type,
                    note: 'Weekly progress review',
                })
            }
            message.success(next ? 'Completed — next follow-up scheduled' : 'Follow-up completed')
            onDone(completed, next)
        } catch (err) {
            message.error(err.message || 'Could not complete follow-up')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title={followUp ? `Complete follow-up · ${followUp.clientName}` : 'Complete follow-up'}
            open={open}
            onCancel={onClose}
            onOk={submit}
            okText="Complete"
            okButtonProps={{ loading: saving }}
            centered
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                className="mt-4"
                requiredMark={false}
                preserve={false}
                initialValues={{ outcome: '', scheduleNext: true, nextDate: dayjs().add(NEXT_FOLLOWUP_DAYS, 'day') }}
            >
                <Form.Item name="outcome" label="Outcome" extra="What was discussed and any action items — the client will see this.">
                    <Input.TextArea rows={4} placeholder="e.g. Adherence is good. Add 2L more water, keep logging meals." />
                </Form.Item>
                <Form.Item name="scheduleNext" valuePropName="checked" className="mb-2">
                    <Checkbox>Schedule the next follow-up</Checkbox>
                </Form.Item>
                {scheduleNext && (
                    <Form.Item name="nextDate" label="Next follow-up date" rules={[{ required: true, message: 'Pick a date' }]}>
                        <DatePicker className="w-full" format="YYYY-MM-DD" />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    )
}
