import { Form, Input, InputNumber, Button, App, Select } from 'antd'
import PageHeader from '../../../components/common/PageHeader'
import UserAvatar from '../../../components/common/UserAvatar'
import StatCard from '../../../components/common/StatCard'
import { currentClient, trainer } from '../../../services/mockData'

export default function Profile() {
    const { message } = App.useApp()

    return (
        <div>
            <PageHeader title="My Profile" subtitle="Your personal details and goals." />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="app-card p-5 lg:col-span-1">
                    <div className="flex flex-col items-center text-center">
                        <UserAvatar name={currentClient.name} color={currentClient.avatarColor} size={88} />
                        <div className="mt-3 text-lg font-bold text-text-primary">{currentClient.name}</div>
                        <div className="text-sm text-text-muted">{currentClient.goal} · {currentClient.plan} plan</div>
                        <Button className="mt-4" block>Change photo</Button>
                    </div>

                    <div className="mt-5 rounded-xl p-4" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Your trainer</div>
                        <div className="mt-2 flex items-center gap-3">
                            <UserAvatar name={trainer.name} color={trainer.avatarColor} size={40} />
                            <div>
                                <div className="text-sm font-semibold text-text-primary">{trainer.name}</div>
                                <div className="text-xs text-text-muted">{trainer.specialization}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="mb-4 grid grid-cols-3 gap-4">
                        <StatCard label="Start" value={`${currentClient.startWeight}kg`} />
                        <StatCard label="Current" value={`${currentClient.weight}kg`} accent="var(--color-primary)" />
                        <StatCard label="Target" value={`${currentClient.target}kg`} accent="var(--color-success)" />
                    </div>

                    <div className="app-card p-5">
                        <h3 className="section-title mb-4">Personal details</h3>
                        <Form
                            layout="vertical"
                            initialValues={{
                                name: currentClient.name,
                                email: currentClient.email,
                                goal: currentClient.goal,
                                target: currentClient.target,
                                phone: '+1 (555) 013-8890',
                            }}
                            onFinish={() => message.success('Profile updated')}
                        >
                            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                                <Form.Item name="name" label="Full name" rules={[{ required: true }]}><Input /></Form.Item>
                                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
                                <Form.Item name="phone" label="Phone"><Input /></Form.Item>
                                <Form.Item name="goal" label="Fitness goal">
                                    <Select
                                        options={['Weight Loss', 'Muscle Gain', 'General Fitness', 'Endurance', 'Toning'].map((g) => ({ value: g, label: g }))}
                                    />
                                </Form.Item>
                                <Form.Item name="target" label="Target weight (kg)"><InputNumber min={30} max={200} style={{ width: '100%' }} /></Form.Item>
                            </div>
                            <Button type="primary" htmlType="submit">Save changes</Button>
                        </Form>
                    </div>
                </div>
            </div>
        </div>
    )
}
