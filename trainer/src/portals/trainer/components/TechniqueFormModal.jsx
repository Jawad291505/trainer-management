import { useEffect, useState } from 'react'
import { Modal, Form, Input, App } from 'antd'
import { BulbOutlined, SaveOutlined, PlusOutlined } from '@ant-design/icons'
import ModalTitle from '../../../components/common/ModalTitle'
import YouTubePreview from '../../../components/common/YouTubePreview'
import { useLibrary } from '../../../context/LibraryContext'
import { youtubeRule } from '../../../utils/youtube'

// Create or edit one of the trainer's own techniques (title, instructions,
// optional YouTube demo). `technique` is the row being edited, or null to create one.
export default function TechniqueFormModal({ open, technique, onClose, onSaved }) {
    const { message } = App.useApp()
    const { addTechnique, updateTechnique } = useLibrary([])
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const youtube = Form.useWatch('youtube', form)

    useEffect(() => {
        if (!open) return
        form.resetFields()
        if (technique) form.setFieldsValue({ title: technique.title, instructions: technique.instructions, youtube: technique.youtube })
    }, [open, technique, form])

    const save = async () => {
        const fields = await form.validateFields()
        const v = { ...fields, youtube: (fields.youtube || '').trim() } // blank = no video
        setSaving(true)
        try {
            const saved = technique
                ? await updateTechnique(technique._id || technique.id, v)
                : await addTechnique(v)
            message.success(technique ? 'Technique updated' : 'Technique added')
            onSaved?.(saved)
            onClose()
        } catch (err) {
            // A duplicate title comes back as a field-level conflict.
            if (err.status === 409) form.setFields([{ name: 'title', errors: [err.message] }])
            else message.error(err.message || 'Failed to save technique')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title={
                <ModalTitle
                    icon={<BulbOutlined />}
                    title={technique ? 'Edit technique' : 'New technique'}
                    subtitle={technique ? 'Plans that already use it keep their current version' : 'Saved to your personal library'}
                />
            }
            open={open}
            onCancel={onClose}
            onOk={save}
            okText={technique ? 'Save changes' : 'Add technique'}
            okButtonProps={{ icon: technique ? <SaveOutlined /> : <PlusOutlined /> }}
            confirmLoading={saving}
            centered
            width={520}
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-4">
                <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: 'Enter a title' }, { max: 120, message: 'Keep it under 120 characters' }]}>
                    <Input placeholder="e.g. Tempo squat — 3 second descent" />
                </Form.Item>
                <Form.Item name="instructions" label="Instructions" rules={[{ required: true, whitespace: true, message: 'Enter the instructions' }, { max: 5000, message: 'Keep it under 5000 characters' }]}>
                    <Input.TextArea rows={5} placeholder="Step-by-step cues the client should follow." />
                </Form.Item>
                <Form.Item name="youtube" label="YouTube URL (optional)" rules={[youtubeRule]} className="mb-2">
                    <Input placeholder="https://youtube.com/watch?v=…" inputMode="url" />
                </Form.Item>
                <YouTubePreview url={youtube} title={form.getFieldValue('title') || 'Technique video'} />
            </Form>
        </Modal>
    )
}
