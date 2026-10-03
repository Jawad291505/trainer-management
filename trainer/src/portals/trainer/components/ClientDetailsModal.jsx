import { useEffect, useState } from 'react'
import { Modal, Form, Input, InputNumber, App } from 'antd'
import { api } from '../../../services/api'

// Edit a client's personal details. Only the name is required — age, height,
// phone and medical notes are optional, and clearing one removes it.
export default function ClientDetailsModal({ client, open, onClose, onSaved, canEditName = true }) {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open || !client) return
        form.setFieldsValue({
            name: client.name,
            phone: client.phone || '',
            age: client.age ?? null,
            height: client.height ?? null,
            medicalNotes: client.medicalNotes || '',
        })
    }, [open, client, form])

    const save = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            const updated = await api.patch(`/clients/${client.id}`, {
                ...(canEditName ? { name: v.name.trim() } : {}),
                phone: v.phone || '',
                age: v.age ?? null,
                height: v.height ?? null,
                medicalNotes: v.medicalNotes || '',
            })
            onSaved(updated)
            message.success('Client details updated')
            onClose()
        } catch (err) {
            message.error(err.message || 'Failed to update client details')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title="Edit client details"
            open={open}
            onCancel={() => { if (!saving) onClose() }}
            onOk={save}
            okText="Save changes"
            confirmLoading={saving}
            centered
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item name="name" label="Full name" rules={[{ required: true, whitespace: true, message: 'Name is required' }]}>
                    <Input disabled={!canEditName} />
                </Form.Item>
                <Form.Item name="phone" label="Phone" rules={[{ pattern: /^\+?[\d\s().-]{6,20}$/, message: 'Enter a valid phone number' }]}>
                    <Input placeholder="+1 (555) 000-0000" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-x-4">
                    <Form.Item name="age" label="Age"><InputNumber min={1} max={120} precision={0} style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="height" label="Height (cm)"><InputNumber min={50} max={300} style={{ width: '100%' }} /></Form.Item>
                </div>
                <Form.Item name="medicalNotes" label="Medical notes">
                    <Input.TextArea rows={3} maxLength={2000} placeholder="Conditions, injuries, allergies, medication…" />
                </Form.Item>
            </Form>
        </Modal>
    )
}
