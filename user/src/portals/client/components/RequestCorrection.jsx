import { useState } from 'react'
import { Button, Modal, Form, Input, Select, App } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useCorrections } from '../../../context/CorrectionsContext'
import { correctionTypeOptions } from '../../../services/mockData'

// Drop-in "Request a correction" button + modal for the client's plan pages.
// `area` is one of diet | exercise | progress | general.
// `items` (optional) pre-fills the item picker with things on that page.
export default function RequestCorrection({ area, items = [], size, block, type = 'default' }) {
    const { message } = App.useApp()
    const { addRequest } = useCorrections()
    const [open, setOpen] = useState(false)
    const [form] = Form.useForm()

    const submit = async () => {
        const v = await form.validateFields()
        addRequest({ area, item: v.item, type: v.type, note: v.note })
        form.resetFields()
        setOpen(false)
        message.success('Request sent to your trainer')
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
                onCancel={() => setOpen(false)}
                onOk={submit}
                okText="Send to trainer"
                centered
            >
                <p className="mb-3 text-sm text-text-secondary">
                    Your trainer will see this and either make the change or reply with why not.
                </p>
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item name="item" label="What is this about?">
                        {items.length > 0 ? (
                            <Select
                                allowClear
                                showSearch
                                placeholder="Pick an item (optional)"
                                options={items.map((i) => ({ value: i, label: i }))}
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
