import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Checkbox, App } from 'antd'
import {
    MailOutlined,
    LockOutlined,
    UserOutlined,
    ArrowRightOutlined,
    CheckCircleFilled,
} from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

const CONFIG = {
    subtitle: 'Admin Console',
    heroTitle: 'Run the platform with confidence.',
    heroSub: 'Trainers, clients, assignments and billing — managed from one console.',
    highlights: [
        'Full oversight of trainers & clients',
        'Assignments and capacity at a glance',
        'Payments, plans and content libraries',
    ],
    demoEmail: 'alexandra.reed@fittrack.io',
    demoPassword: 'demo1234',
}

function Brand({ className = '' }) {
    return (
        <div
            className={`sidebar-brand flex h-11 w-11 items-center justify-center rounded-xl text-base font-black text-white ${className}`}
        >
            FT
        </div>
    )
}

export default function Login() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const { login } = useAuth()
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
            const user = await login(values.email, values.password)
            if (!['admin', 'member'].includes(user.role)) {
                message.error('This portal is for admins and members only')
                setLoading(false)
                return
            }
            navigate(user.mustChangePassword ? '/set-password' : '/', { replace: true })
        } catch (err) {
            message.error(err.message || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
            {/* Hero */}
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
                    <h1 className="text-4xl font-extrabold leading-[1.15] xl:text-[2.75rem]">
                        {CONFIG.heroTitle}
                    </h1>
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

                <div className="relative text-xs text-white/45">
                    © {new Date().getFullYear()} FitTrack. All rights reserved.
                </div>
            </div>

            {/* Form panel */}
            <div className="auth-panel flex items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <Brand />
                        <div className="text-base font-extrabold text-text-primary">FitTrack</div>
                    </div>

                    <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">
                        Welcome back
                    </h2>
                    <p className="mt-1.5 text-sm text-text-secondary">
                        Sign in to continue to your dashboard.
                    </p>

                    <Form
                        form={form}
                        layout="vertical"
                        requiredMark={false}
                        className="mt-8"
                        initialValues={{ email: CONFIG.demoEmail, password: CONFIG.demoPassword, remember: true }}
                        onFinish={submit}
                    >
                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                { required: true, message: 'Enter your email' },
                                { type: 'email', message: 'Enter a valid email' },
                            ]}
                        >
                            <Input size="large" prefix={<MailOutlined />} placeholder="you@example.com" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Password"
                            rules={[{ required: true, message: 'Enter your password' }]}
                        >
                            <Input.Password size="large" prefix={<LockOutlined />} placeholder="••••••••" />
                        </Form.Item>

                        <div className="mb-5 flex items-center justify-between">
                            <Form.Item name="remember" valuePropName="checked" noStyle>
                                <Checkbox>Remember me</Checkbox>
                            </Form.Item>
                        </div>

                        <Button
                            type="primary"
                            size="large"
                            block
                            htmlType="submit"
                            loading={loading}
                            iconPosition="end"
                            icon={loading ? undefined : <ArrowRightOutlined />}
                        >
                            Sign in
                        </Button>
                    </Form>

                    <p className="mt-4 text-center text-sm text-text-secondary">
                        Signing up as a Member? <Link to="/signup" className="font-semibold text-primary">Create an account</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
