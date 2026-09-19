import { useRef, useState } from 'react'
import { Button, Modal, Form, Input, Select, App } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useCorrections } from '../../../context/CorrectionsContext'

const correctionTypeOptions = [
    { value: 'swap', label: 'Swap / substitute' },
    { value: 'too-hard', label: 'Too difficult' },
    { value: 'injury', label: 'Injury / pain' },
    { value: 'wrong-data', label: 'Wrong data' },
    { value: 'other', label: 'Other' },
]

// Drop-in "Request a correction" button + modal for the client's plan pages.
// `area` is one of diet | exercise | progress | general.
// `items` (optional) pre-fills the item picker with things on that page: plain
// strings, or { label, refId } so the request points at the exact meal /
// exercise (`targetKind` = 'meal' | 'exercise', `targetDate` = the day being viewed).
export default function RequestCorrection({ area, items = [], targetKind, targetDate, size, block, type = 'default' }) {
    const { message } = App.useApp()
    const { addRequest } = useCorrections({ load: false })
    const [open, setOpen] = useState(false)
    const [sending, setSending] = useState(false)
    const sendingRef = useRef(false) // blocks a second tap before React re-renders the disabled button
    const [form] = Form.useForm()

    const options = items.map((i) => (typeof i === 'string' ? { label: i, value: i } : { label: i.label, value: i.label, refId: i.refId }))

    const submit = async () => {
        if (sendingRef.current) return
        const v = await form.validateFields()
        sendingRef.current = true
        setSending(true)
        const picked = options.find((o) => o.value === v.item)
        try {
            await addRequest({
                area,
                item: v.item,
                type: v.type,
                note: v.note,
                ...(picked?.refId && targetKind ? { target: { kind: targetKind, refId: picked.refId, date: targetDate || undefined } } : {}),
            })
            form.resetFields()
            setOpen(false)
            message.success(v.type === 'injury' ? 'Sent to your trainer as a priority' : 'Request sent to your trainer')
        } catch (err) {
            message.error(err.message || 'Could not send your request — please try again')
        } finally {
            sendingRef.current = false
            setSending(false)
        }
    }

    return (
        <>
            <Button
                icon={<EditOutlined />}
                size={size}
                block={block}
                type={type}
                onClick={() => {
                    form.setFieldsValue({ type: 'swap', item: undefined, note: '' })
                    setOpen(true)
                }}
            >
                Request a correction
            </Button>

            <Modal
                title="Request a correction"
                open={open}
                onCancel={() => { if (!sending) setOpen(false) }}
                onOk={submit}
                okText="Send to trainer"
                okButtonProps={{ loading: sending }}
                cancelButtonProps={{ disabled: sending }}
                confirmLoading={sending}
                maskClosable={!sending}
                closable={!sending}
                centered
            >
                <p className="mb-3 text-sm text-text-secondary">
                    Your trainer will see this and either make the change or reply with why not.
                </p>
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="item" label="What is this about?">
                        {options.length > 0 ? (
                            <Select
                                allowClear
                                showSearch
                                placeholder="Pick an item (optional)"
                                options={options}
                            />
                        ) : (
                            <Input placeholder="e.g. this week's weigh-in (optional)" />
                        )}
                    </Form.Item>
                    <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                        <Select options={correctionTypeOptions} />
                    </Form.Item>
                    <Form.Item
                        name="note"
                        label="Details"
                        rules={[{ required: true, message: 'Tell your trainer what needs changing' }]}
                    >
                        <Input.TextArea rows={4} placeholder="Describe what you'd like corrected and why…" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    )
}
