import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, App } from 'antd'
import { MailOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

// Step 2 of Trainer (outsourced) self-signup: verify the OTP emailed at signup.
export default function VerifyEmail() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { user, refreshUser, logout } = useAuth()
    const [loading, setLoading] = useState(false)
    const [resending, setResending] = useState(false)
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
            await api.post('/member-signup/verify-otp', { otp: values.otp })
            await refreshUser()
            message.success('Email verified!')
            navigate('/select-plan', { replace: true })
        } catch (err) {
            message.error(err.message || 'Could not verify that code')
        } finally {
            setLoading(false)
        }
    }

    const resend = async () => {
        setResending(true)
        try {
            const res = await api.post('/member-signup/resend-otp')
            if (!res.otpSent) {
                message.warning(`Couldn't email a new code (${res.otpWarning || 'email not configured'}).${res.devOtp ? ` Your code: ${res.devOtp}` : ''}`, 12)
            } else {
                message.success('A new code has been sent to your email.')
            }
        } catch (err) {
            message.error(err.message || 'Could not resend the code')
        } finally {
            setResending(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--color-primary-soft, #eef2ff)' }}>
                    <MailOutlined style={{ fontSize: 24, color: 'var(--color-primary)' }} />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-text-primary">Verify your email</h2>
                <p className="mt-1.5 text-sm text-text-secondary">
                    We sent a 6-digit code to <strong>{user?.email}</strong>. Enter it below to continue.
                </p>

                <Form form={form} layout="vertical" requiredMark={false} className="mt-8 text-left" onFinish={submit}>
                    <Form.Item
                        name="otp"
                        label="Verification code"
                        rules={[
                            { required: true, message: 'Enter the 6-digit code' },
                            { len: 6, message: 'Code must be 6 digits' },
                        ]}
                    >
                        <Input size="large" maxLength={6} inputMode="numeric" placeholder="123456" style={{ letterSpacing: 6, textAlign: 'center', fontWeight: 700 }} />
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
                        Verify & continue
                    </Button>
                </Form>

                <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                    <Button type="link" onClick={resend} loading={resending} className="px-0">
                        Resend code
                    </Button>
                    <Button type="link" onClick={logout} className="px-0" style={{ color: 'var(--color-text-secondary)' }}>
                        Log out
                    </Button>
                </div>
            </div>
        </div>
    )
}
