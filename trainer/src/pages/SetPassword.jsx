import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, App } from 'antd'
import { LockOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

// Forced first-login screen for any invited account (Admin/Member/Trainer/Client
// share this same flow — see backend services/invite.service.js). Reached
// whenever AppRoutes sees user.mustChangePassword, or when the API 403s with
// PASSWORD_CHANGE_REQUIRED (services/api.js redirects here directly).
export default function SetPassword() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user, refreshUser, logout } = useAuth()
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()

    const submit = async () => {
        let values
        try {
            values = await form.validateFields()
        } catch {
            return
        }
        setLoading(true)
        try {
            await api.patch('/auth/me', {
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            })
            await refreshUser()
            message.success('Password set — welcome in!')
            navigate('/', { replace: true })
        } catch (err) {
            message.error(err.message || 'Could not set your password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm">
                <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Set your password</h2>
                <p className="mt-1.5 text-sm text-text-secondary">
                    {user?.name ? `Welcome, ${user.name}. ` : ''}
                    For your security, create a permanent password to replace the temporary one from your invite email.
                </p>

                <Form form={form} layout="vertical" requiredMark={false} className="mt-8" onFinish={submit}>
                    <Form.Item
                        name="currentPassword"
                        label="Temporary password"
                        rules={[{ required: true, message: 'Enter the temporary password from your invite email' }]}
                    >
                        <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                    </Form.Item>

                    <Form.Item
                        name="newPassword"
                        label="New password"
                        hasFeedback
                        rules={[
                            { required: true, message: 'Enter a new password' },
                            { min: 8, message: 'At least 8 characters' },
                        ]}
                    >
                        <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Confirm new password"
                        dependencies={['newPassword']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Confirm your new password' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                                    return Promise.reject(new Error('Passwords do not match'))
                                },
                            }),
                        ]}
                    >
                        <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                    </Form.Item>

                    <Button
                        type="primary"
                        size="large"
                        block
                        htmlType="submit"
                        loading={loading}
                        iconPosition="end"
                        icon={loading ? undefined : <ArrowRightOutlined />}
                    >
                        Set password & continue
                    </Button>
                </Form>

                <Button type="link" onClick={logout} className="mt-2 px-0">
                    Log out
                </Button>
            </div>
        </div>
    )
}
