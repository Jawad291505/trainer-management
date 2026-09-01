import { useMemo, useState } from 'react'
import { Select, Segmented, Button, Modal, Form, Input, App, Dropdown } from 'antd'
import {
    PlusOutlined,
    LinkOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    ReadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    PlayCircleOutlined,
    FileTextOutlined,
    AppleOutlined,
    BulbOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import { confirmDelete } from '../../../utils/confirm'
import { libraryResources as seed, libraryCategories } from '../../../services/mockData'

const CAT_ICON = {
    'Workout Guides': ReadOutlined,
    'Nutrition Guides': AppleOutlined,
    'Exercise Videos': PlayCircleOutlined,
    Documents: FileTextOutlined,
    'Educational Resources': BulbOutlined,
}

export default function Libraries() {
    const { message } = App.useApp()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [view, setView] = useState('grid')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((r) => {
            const matchQ = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
            const matchC = category === 'all' || r.category === category
            return matchQ && matchC
        })
    }, [data, search, category])

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        setModalOpen(true)
    }
    const openEdit = (r) => {
        setEditing(r)
        form.setFieldsValue(r)
        setModalOpen(true)
    }

    const save = async () => {
        const values = await form.validateFields()
        if (editing) {
            setData((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...values } : r)))
            message.success('Resource updated')
        } else {
            setData((prev) => [
                { id: `LB-${Date.now()}`, status: 'active', updated: new Date().toISOString().slice(0, 10), ...values },
                ...prev,
            ])
            message.success('Resource added')
        }
        setModalOpen(false)
    }

    const remove = (r) =>
        confirmDelete({
            title: 'Delete resource?',
            content: `Remove "${r.title}" from the library?`,
            onOk: () => {
                setData((prev) => prev.filter((x) => x.id !== r.id))
                message.success('Resource deleted')
            },
        })

    const cardMenu = (r) => ({
        items: [
            { key: 'open', icon: <LinkOutlined />, label: 'Open link' },
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { key: 'toggle', label: r.status === 'active' ? 'Deactivate' : 'Activate' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'open') window.open(r.url, '_blank', 'noopener,noreferrer')
            else if (key === 'edit') openEdit(r)
            else if (key === 'delete') remove(r)
            else if (key === 'toggle') {
                setData((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x)))
                message.success('Status updated')
            }
        },
    })

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'title',
            render: (_, r) => {
                const Icon = CAT_ICON[r.category] || ReadOutlined
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                            <Icon />
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-semibold text-text-primary">{r.title}</div>
                            <div className="truncate text-xs text-text-muted">{r.description}</div>
                        </div>
                    </div>
                )
            },
        },
        { title: 'Category', dataIndex: 'category', width: 180, render: (c) => <span className="text-text-secondary">{c}</span> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Updated', dataIndex: 'updated', width: 120, render: (d) => <span className="text-text-muted">{d}</span> },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, r) => (
                <Dropdown trigger={['click']} menu={cardMenu(r)}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Library Management" subtitle={`${filtered.length} resources`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add resource
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search resources…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 210 }}
                    options={[{ value: 'all', label: 'All categories' }, ...libraryCategories.map((c) => ({ value: c, label: c }))]}
                />
                <div className="sm:ml-auto">
                    <Segmented
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'grid', icon: <AppstoreOutlined /> },
                            { value: 'table', icon: <UnorderedListOutlined /> },
                        ]}
                    />
                </div>
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No resources found"
                        description="Add your first Google Drive link or external resource."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add resource</Button>}
                    />
                </div>
            ) : view === 'table' ? (
                <DataTable columns={columns} dataSource={filtered} pageSize={8} scrollX={800} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((r) => {
                        const Icon = CAT_ICON[r.category] || ReadOutlined
                        return (
                            <div key={r.id} className="app-card app-card-hover animate-rise flex flex-col p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                        <Icon />
                                    </div>
                                    <Dropdown trigger={['click']} menu={cardMenu(r)}>
                                        <Button type="text" icon={<MoreOutlined />} />
                                    </Dropdown>
                                </div>
                                <div className="mt-3 flex-1">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{r.category}</div>
                                    <div className="mt-1 font-bold text-text-primary">{r.title}</div>
                                    <p className="mt-1 mb-0 line-clamp-2 text-sm text-text-secondary">{r.description}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                    <StatusBadge status={r.status} />
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm font-semibold text-primary"
                                    >
                                        <LinkOutlined /> Open
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal
                title={editing ? 'Edit resource' : 'Add resource'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add resource'}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
                        <Input placeholder="e.g. Full Body Strength Program" />
                    </Form.Item>
                    <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Select a category' }]}>
                        <Select options={libraryCategories.map((c) => ({ value: c, label: c }))} placeholder="Select category" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Short description of the resource" />
                    </Form.Item>
                    <Form.Item
                        name="url"
                        label="External URL"
                        rules={[
                            { required: true, message: 'URL is required' },
                            { type: 'url', message: 'Enter a valid URL' },
                        ]}
                    >
                        <Input placeholder="https://drive.google.com/…" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
