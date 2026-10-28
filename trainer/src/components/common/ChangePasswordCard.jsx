import { useState } from 'react'
import { Form, Input, Button, App } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { api } from '../../services/api'

// In-session password change (PATCH /auth/me with currentPassword + newPassword).
// Forgotten passwords go through the emailed-code flow at /forgot-password instead.
export default function ChangePasswordCard() {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)

    const onFinish = async (v) => {
        setSaving(true)
        try {
            await api.patch('/auth/me', { currentPassword: v.currentPassword, newPassword: v.newPassword })
            form.resetFields()
            message.success('Password updated')
        } catch (err) { message.error(err.message) }
        finally { setSaving(false) }
    }

    return (
        <div className="app-card max-w-xl p-5">
            <h3 className="section-title mb-1">Change password</h3>
            <p className="mb-4 text-sm text-text-secondary">Use at least 8 characters. Forgot your current one? Sign out and use &quot;Forgot password?&quot; on the sign-in page.</p>
            <Form form={form} layout="vertical" requiredMark={false} onFinish={onFinish}>
                <Form.Item name="currentPassword" label="Current password" rules={[{ required: true, message: 'Enter your current password' }]}>
                    <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
                </Form.Item>
                <Form.Item
                    name="newPassword"
                    label="New password"
                    hasFeedback
                    rules={[{ required: true, message: 'Enter a new password' }, { min: 8, message: 'At least 8 characters' }]}
                >
                    <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                </Form.Item>
                <Form.Item
                    name="confirm"
                    label="Confirm new password"
                    dependencies={['newPassword']}
                    hasFeedback
                    rules={[
                        { required: true, message: 'Confirm your new password' },
                        ({ getFieldValue }) => ({
                            validator: (_, v) => (!v || getFieldValue('newPassword') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))),
                        }),
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={saving}>Update password</Button>
            </Form>
        </div>
    )
}
