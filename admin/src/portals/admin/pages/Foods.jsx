import { useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App, Dropdown, Divider, Skeleton } from 'antd'
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    AppleOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ModalTitle from '../../../components/common/ModalTitle'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import { confirmDelete } from '../../../utils/confirm'
import { useLibrary, normalize } from '../../../context/LibraryContext'
import { foodCategories, foodUnits } from '../../../services/foodLibrary'

// Admin food & nutrition management. Foods added/edited here feed the shared
// library that trainers read when building diet plans.
export default function Foods() {
    const { message } = App.useApp()
    // Mutations go through the shared library context; the visible page (search,
    // category filter and paging) is fetched from the backend.
    const { addFood, updateFood, removeFood } = useLibrary([])
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const list = usePagedList('/foods', { params: { category }, search, pageSize: 10, transform: normalize })
    const { items: foods, total, loading, error, reload } = list
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    const unit = Form.useWatch('unit', form)

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue({ category: foodCategories[0], unit: 'g', base: 100, step: 10, defaultQty: 100, gi: 0 })
        setModalOpen(true)
    }
    const openEdit = (f) => {
        setEditing(f)
        form.setFieldsValue(f)
        setModalOpen(true)
    }

    const save = async () => {
        const v = await form.validateFields()
        try {
            if (editing) {
                await updateFood(editing.id, v)
                reload()
                message.success('Food updated')
            } else {
                await addFood(v)
                list.setPage(1)
                reload()
                message.success('Food added')
            }
            setModalOpen(false)
        } catch (err) {
            message.error(err.message || 'Failed to save')
        }
    }

    const remove = (f) =>
        confirmDelete({
            title: 'Delete food?',
            content: `Remove "${f.name}" from the library?`,
            onOk: async () => {
                try {
                    await removeFood(f.id)
                    reload()
                    message.success('Food deleted')
                } catch (err) {
                    message.error(err.message || 'Failed to delete')
                }
            },
        })

    const rowMenu = (f) => ({
        items: [
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'edit') openEdit(f)
            else if (key === 'delete') remove(f)
        },
    })

    const columns = [
        {
            title: 'Food',
            dataIndex: 'name',
            render: (_, f) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold text-text-primary">{f.name}</div>
                    <div className="text-xs text-text-muted">{f.category}</div>
                </div>
            ),
        },
        {
            title: 'Base',
            key: 'base',
            width: 120,
            render: (_, f) => <span className="text-text-secondary">{f.base}{f.unit === 'count' ? '' : f.unit} </span>,
        },
        { title: 'Cal', dataIndex: 'cal', width: 80, render: (v) => <span className="text-text-secondary">{v}</span> },
        {
            title: 'P / C / F',
            key: 'macros',
            width: 130,
            render: (_, f) => <span className="text-text-muted">{f.protein}/{f.carbs}/{f.fat}</span>,
        },
        { title: 'GI', dataIndex: 'gi', width: 70, render: (v) => <span className="text-text-secondary">{v}</span> },
        {
            title: 'Serving',
            key: 'serving',
            width: 140,
            render: (_, f) => f.serving && f.servingWeight
                ? <span className="text-text-secondary">{f.serving} ({f.servingWeight}g)</span>
                : <span className="text-text-muted">—</span>,
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, f) => (
                <Dropdown trigger={['click']} menu={rowMenu(f)}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Food Library" subtitle={loading ? 'Loading foods…' : `${total} foods · shared with trainers`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add food
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search foods…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 190 }}
                    options={[{ value: 'all', label: 'All categories' }, ...foodCategories.map((c) => ({ value: c, label: c }))]}
                />
            </FilterBar>

            {loading ? (
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 8 }} /></div>
            ) : error ? (
                <div className="app-card"><SectionError title="Couldn't load the food library" error={error} onRetry={reload} /></div>
            ) : foods.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No foods found"
                        description="Add a food with its nutrition and glycemic values."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add food</Button>}
                    />
                </div>
            ) : (
                <>
                    <DataTable columns={columns} dataSource={foods} loading={list.fetching} pagination={false} scrollX={760} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </>
            )}

            <Modal
                title={
                    <ModalTitle
                        icon={<AppleOutlined />}
                        title={editing ? 'Edit food' : 'Add food'}
                        subtitle={editing ? editing.name : 'Shared with every trainer'}
                    />
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add food'}
                centered
                width={540}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="name" label="Food name" rules={[{ required: true, message: 'Enter a name' }]}>
                            <Input placeholder="e.g. Chicken Breast" />
                        </Form.Item>
                        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                            <Select options={foodCategories.map((c) => ({ value: c, label: c }))} />
                        </Form.Item>
                        <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                            <Select options={foodUnits} />
                        </Form.Item>
                        <Form.Item
                            name="base"
                            label={unit === 'count' ? 'Base amount (count)' : `Base amount (${unit || 'g'})`}
                            tooltip="The quantity the macros below are measured against"
                            rules={[{ required: true, message: 'Enter a base amount' }]}
                        >
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="step" label="Quantity step" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="defaultQty" label="Default quantity" rules={[{ required: true }]}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>

                    <Divider className="my-2" plain>
                        <span className="text-xs text-text-muted">Serving (for "add by unit" in diet plans)</span>
                    </Divider>

                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="serving" label="Serving label" tooltip="e.g. '1 large egg', '1 slice', '1 medium'. Leave empty if not applicable.">
                            <Input placeholder="e.g. 1 large egg" />
                        </Form.Item>
                        <Form.Item name="servingWeight" label="Grams per serving" tooltip="How many grams one unit weighs. Trainers can then add '2 eggs' instead of '100g'.">
                            <InputNumber min={1} max={2000} style={{ width: '100%' }} placeholder="e.g. 50" />
                        </Form.Item>
                    </div>

                    <Divider className="my-2" plain>
                        <span className="text-xs text-text-muted">Nutrition per base amount</span>
                    </Divider>

                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="cal" label="Calories" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="gi" label="Glycemic Index" rules={[{ required: true }]}><InputNumber min={0} max={110} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="protein" label="Protein (g)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="carbs" label="Carbs (g)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="fat" label="Fats (g)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}
