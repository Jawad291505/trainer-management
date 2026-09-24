import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, App } from 'antd'
import { MailOutlined, LockOutlined, SafetyCertificateOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { api } from '../services/api'

const STEPS = {
    email: { title: 'Forgot your password?', sub: "Enter your account email and we'll send you a verification code." },
    otp: { title: 'Check your email', sub: 'Enter the 6-digit code we sent. It expires in 10 minutes.' },
    password: { title: 'Choose a new password', sub: 'Your code is verified — set a new password to finish.' },
}

// Forgot password: email -> emailed OTP -> new password. Not available to super
// admin accounts (the backend never sends them a code).
export default function ForgotPassword() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [step, setStep] = useState('email')
    const [email, setEmail] = useState('')
    const [resetToken, setResetToken] = useState('')
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()

    const run = async (fn) => {
        setLoading(true)
        try {
            await fn()
        } catch (err) {
            message.error(err.message || 'Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const sendCode = (addr) => run(async () => {
        await api.post('/auth/forgot-password', { email: addr })
        setEmail(addr)
        setStep('otp')
        form.resetFields(['otp'])
        message.success('If that email is registered, a code is on its way.')
    })

    const onFinish = (values) => {
        if (step === 'email') return sendCode(values.email.trim())
        if (step === 'otp') {
            return run(async () => {
                const res = await api.post('/auth/verify-reset-otp', { email, otp: values.otp.trim() })
                setResetToken(res.resetToken)
                setStep('password')
            })
        }
        return run(async () => {
            await api.post('/auth/reset-password', { resetToken, newPassword: values.password })
            message.success('Password updated — please sign in.')
            navigate('/login', { replace: true })
        })
    }

    const { title, sub } = STEPS[step]

    return (
        <div className="auth-panel flex min-h-screen items-center justify-center p-6 sm:p-10">
            <div className="w-full max-w-sm">
                <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">{title}</h2>
                <p className="mt-1.5 text-sm text-text-secondary">{sub}</p>

                <Form form={form} layout="vertical" requiredMark={false} className="mt-8" onFinish={onFinish}>
                    {step === 'email' && (
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Enter a valid email' }]}
                        >
                            <Input size="large" prefix={<MailOutlined />} placeholder="you@example.com" autoFocus />
                        </Form.Item>
                    )}

                    {step === 'otp' && (
                        <Form.Item
                            name="otp"
                            label={`Verification code sent to ${email}`}
                            rules={[{ required: true, message: 'Enter the code' }, { len: 6, message: 'The code is 6 digits' }]}
                        >
                            <Input size="large" prefix={<SafetyCertificateOutlined />} placeholder="123456" maxLength={6} inputMode="numeric" autoFocus />
                        </Form.Item>
                    )}

                    {step === 'password' && (
                        <>
                            <Form.Item
                                name="password"
                                label="New password"
                                rules={[{ required: true, message: 'Enter a new password' }, { min: 8, message: 'At least 8 characters' }]}
                                hasFeedback
                            >
                                <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" autoFocus />
                            </Form.Item>
                            <Form.Item
                                name="confirm"
                                label="Confirm password"
                                dependencies={['password']}
                                hasFeedback
                                rules={[
                                    { required: true, message: 'Confirm your password' },
                                    ({ getFieldValue }) => ({
                                        validator: (_, v) => (!v || getFieldValue('password') === v ? Promise.resolve() : Promise.reject(new Error('Passwords do not match'))),
                                    }),
                                ]}
                            >
                                <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                            </Form.Item>
                        </>
                    )}

                    <Button type="primary" size="large" block htmlType="submit" loading={loading}>
                        {step === 'email' ? 'Send code' : step === 'otp' ? 'Verify code' : 'Update password'}
                    </Button>
                </Form>

                {step === 'otp' && (
                    <p className="mt-4 text-center text-sm text-text-secondary">
                        Didn't get it?{' '}
                        <button type="button" className="font-semibold text-primary" disabled={loading} onClick={() => sendCode(email)}>Resend code</button>
                    </p>
                )}
                <p className="mt-4 text-center text-sm text-text-secondary">
                    <Link to="/login" className="font-semibold text-primary"><ArrowLeftOutlined /> Back to sign in</Link>
                </p>
                <p className="mt-6 text-center text-xs text-text-muted">Administrator accounts can't be reset here.</p>
            </div>
        </div>
    )
}
