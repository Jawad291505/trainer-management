import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, App } from 'antd'
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined, ArrowRightOutlined, CheckCircleFilled } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const CONFIG = {
    subtitle: 'Member Signup',
    heroTitle: 'Grow your own coaching business.',
    heroSub: 'Sign up, verify your email, pick a plan, and start managing your own trainers and clients.',
    highlights: [
        'Choose the plan that fits your team',
        'Verify your email in seconds',
        'Get reviewed and activated fast',
    ],
}

function Brand({ className = '' }) {
    return (
        <div className={`sidebar-brand flex h-11 w-11 items-center justify-center rounded-xl text-base font-black text-white ${className}`}>
            FT
        </div>
    )
}

// Step 1 of Member self-signup: Signup -> OTP -> Plan -> Payment -> Pending Approval.
export default function Signup() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { signup } = useAuth()
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
            const data = await signup({
                name: values.name,
                email: values.email,
                password: values.password,
                phone: values.phone,
            })
            if (!data.otpSent) {
                message.warning(`Account created, but we couldn't email your verification code (${data.otpWarning || 'email not configured'}).${data.devOtp ? ` Your code: ${data.devOtp}` : ''}`, 12)
            } else {
                message.success('Account created — check your email for a verification code.')
            }
            navigate('/verify-email', { replace: true })
        } catch (err) {
            message.error(err.message || 'Could not create your account')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
            <div className="auth-hero relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
                <div className="auth-hero-grid" />
                <div className="relative flex items-center gap-3">
                    <Brand />
                    <div className="leading-tight">
                        <div className="text-base font-extrabold">FitTrack</div>
                        <div className="text-xs text-white/60">{CONFIG.subtitle}</div>
                    </div>
                </div>
                <div className="relative max-w-md">
                    <h1 className="text-4xl font-extrabold leading-[1.15] xl:text-[2.75rem]">{CONFIG.heroTitle}</h1>
                    <p className="mt-4 text-[15px] leading-relaxed text-white/70">{CONFIG.heroSub}</p>
                    <ul className="mt-9 space-y-3.5">
                        {CONFIG.highlights.map((h) => (
                            <li key={h} className="flex items-center gap-3 text-sm text-white/85">
                                <CheckCircleFilled style={{ opacity: 0.85 }} />
                                {h}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative text-xs text-white/45">© {new Date().getFullYear()} FitTrack. All rights reserved.</div>
            </div>

            <div className="auth-panel flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <Brand />
                        <div className="text-base font-extrabold text-text-primary">FitTrack</div>
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">Create your Member account</h2>
                    <p className="mt-1.5 text-sm text-text-secondary">Manage your own trainers and clients on FitTrack.</p>

                    <Form form={form} layout="vertical" requiredMark={false} className="mt-8" onFinish={submit}>
                        <Form.Item name="name" label="Full name" rules={[{ required: true, message: 'Enter your name' }]}>
                            <Input size="large" prefix={<UserOutlined />} placeholder="e.g. Priya Sharma" />
                        </Form.Item>
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, message: 'Enter your email' }, { type: 'email', message: 'Enter a valid email' }]}
                        >
                            <Input size="large" prefix={<MailOutlined />} placeholder="you@example.com" />
                        </Form.Item>
                        <Form.Item name="phone" label="Phone (optional)">
                            <Input size="large" prefix={<PhoneOutlined />} placeholder="+92 300 1234567" />
                        </Form.Item>
                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[{ required: true, message: 'Enter a password' }, { min: 8, message: 'At least 8 characters' }]}
                            hasFeedback
                        >
                            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                        </Form.Item>
                        <Form.Item
                            name="confirmPassword"
                            label="Confirm password"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                { required: true, message: 'Confirm your password' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) return Promise.resolve()
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
                            Create account
                        </Button>
                    </Form>

                    <p className="mt-4 text-center text-sm text-text-secondary">
                        Already have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
