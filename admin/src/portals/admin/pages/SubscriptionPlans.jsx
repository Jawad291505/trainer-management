import { useEffect, useState } from 'react'
import { Button, App, Modal, Form, Input, InputNumber, Switch, Dropdown, Tag } from 'antd'
import { PlusOutlined, MoreOutlined, EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import EmptyState from '../../../components/common/EmptyState'
import LoadingSkeleton from '../../../components/feedback/LoadingSkeleton'
import SectionError from '../../../components/feedback/SectionError'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'

const money = (n, currency) => `${currency} ${Number(n).toLocaleString()}`

// Super Admin manages the Member subscription tiers shown on the self-signup
// plan-selection page (admin/src/pages/SelectPlan.jsx) — fully data-driven,
// nothing about plans is hardcoded in the app.
export default function SubscriptionPlans() {
    const { message } = App.useApp()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()

    const fetchPlans = async () => {
        setLoading(true)
        setLoadError(null)
        try {
            const res = await api.get('/subscription-plans')
            setData(res.items || [])
        } catch (err) {
            setLoadError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchPlans() }, [])

    const openCreate = () => {
        setEditing('new')
        form.setFieldsValue({ name: '', priceMonthly: 5000, currency: 'PKR', maxClients: 20, maxTrainers: 5, description: '', active: true })
    }
    const openEdit = (plan) => {
        setEditing(plan)
        form.setFieldsValue(plan)
    }

    const savePlan = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            if (editing === 'new') {
                const created = await api.post('/subscription-plans', v)
                setData((prev) => [...prev, created])
                message.success(`${v.name} created`)
            } else {
                const updated = await api.patch(`/subscription-plans/${editing.id}`, v)
                setData((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
                message.success('Plan updated')
            }
            setEditing(null)
        } catch (err) {
            message.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    const toggleActive = async (plan) => {
        try {
            const updated = await api.patch(`/subscription-plans/${plan.id}`, { active: !plan.active })
            setData((prev) => prev.map((p) => (p.id === plan.id ? updated : p)))
            message.success(`${plan.name} ${updated.active ? 'activated' : 'deactivated'}`)
        } catch (err) { message.error(err.message) }
    }

    const deletePlan = (plan) => {
        confirmDelete({
            title: 'Delete plan?',
            content: `This removes "${plan.name}". Members already on this plan keep their current client limit. Consider deactivating instead if anyone might still be using it.`,
            okText: 'Delete plan',
            onOk: async () => {
                try {
                    await api.delete(`/subscription-plans/${plan.id}`)
                    setData((prev) => prev.filter((p) => p.id !== plan.id))
                    message.success('Plan deleted')
                } catch (err) { message.error(err.message) }
            },
        })
    }

    if (loading) return <LoadingSkeleton />
    if (loadError) return <div className="app-card"><SectionError title="Couldn't load plans" error={loadError} onRetry={fetchPlans} /></div>

    return (
        <div>
            <PageHeader title="Subscription Plans" subtitle="Manage the plans Members can sign up for">
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add plan</Button>
            </PageHeader>

            {data.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No plans yet" description="Add a plan to let Members sign up." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.map((plan) => (
                        <div key={plan.id} className="app-card flex flex-col p-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 font-bold text-text-primary">
                                        {plan.name}
                                        {!plan.active && <Tag color="default">Inactive</Tag>}
                                    </div>
                                    {plan.description && <div className="text-xs text-text-muted">{plan.description}</div>}
                                </div>
                                <Dropdown
                                    trigger={['click']}
                                    menu={{
                                        items: [
                                            { key: 'edit', icon: <EditOutlined />, label: 'Edit plan' },
                                            {
                                                key: 'toggle',
                                                icon: plan.active ? <StopOutlined /> : <CheckCircleOutlined />,
                                                label: plan.active ? 'Deactivate' : 'Activate',
                                            },
                                            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
                                        ],
                                        onClick: ({ key }) => {
                                            if (key === 'edit') openEdit(plan)
                                            else if (key === 'toggle') toggleActive(plan)
                                            else if (key === 'delete') deletePlan(plan)
                                        },
                                    }}
                                >
                                    <Button type="text" icon={<MoreOutlined />} />
                                </Dropdown>
                            </div>
                            <div className="mt-4 text-2xl font-extrabold text-text-primary">
                                {money(plan.priceMonthly, plan.currency)}<span className="text-xs font-medium text-text-muted"> /mo</span>
                            </div>
                            <div className="mt-2 text-sm text-text-secondary">Up to {plan.maxClients} clients · {plan.maxTrainers} trainers</div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                title={editing === 'new' ? 'Add plan' : 'Edit plan'}
                open={!!editing}
                onCancel={() => setEditing(null)}
                onOk={savePlan}
                okText={editing === 'new' ? 'Create' : 'Save changes'}
                confirmLoading={saving}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Plan name" rules={[{ required: true, message: 'Name is required' }]}>
                        <Input placeholder="e.g. Starter" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input placeholder="e.g. Up to 20 clients" />
                    </Form.Item>
                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
                        <Form.Item name="priceMonthly" label="Price / month" rules={[{ required: true }]}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="currency" label="Currency" rules={[{ required: true }]}>
                            <Input placeholder="PKR" />
                        </Form.Item>
                        <Form.Item
                            name="maxClients"
                            label="Max clients"
                            rules={[{ required: true, message: 'Required' }]}
                            dependencies={['maxTrainers']}
                        >
                            <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                onChange={() => form.validateFields(['maxTrainers'])}
                            />
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="maxTrainers"
                        label="Max trainers"
                        tooltip="Trainer capacity for this plan — can never exceed the client capacity."
                        dependencies={['maxClients']}
                        rules={[
                            { required: true, message: 'Required' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (value == null || value <= getFieldValue('maxClients')) return Promise.resolve()
                                    return Promise.reject(new Error('Trainer capacity cannot exceed client capacity'))
                                },
                            }),
                        ]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="active" label="Visible for signup" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
