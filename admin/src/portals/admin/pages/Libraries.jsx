import { useState } from 'react'
import { Select, Segmented, Button, Modal, Form, Input, App, Dropdown, Skeleton } from 'antd'
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
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import { confirmDelete } from '../../../utils/confirm'
import { api } from '../../../services/api'

const LIBRARY_CATEGORIES = ['Workout Guides', 'Nutrition Guides', 'Exercise Videos', 'Documents', 'Educational Resources']

const CAT_ICON = {
    'Workout Guides': ReadOutlined,
    'Nutrition Guides': AppleOutlined,
    'Exercise Videos': PlayCircleOutlined,
    Documents: FileTextOutlined,
    'Educational Resources': BulbOutlined,
}

export default function Libraries() {
    const { message } = App.useApp()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const list = usePagedList('/resources', { params: { category }, search, pageSize: 12 })
    const { items: data, total, loading, error: loadError, setItems: setData, reload: load } = list
    const [view, setView] = useState('grid')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

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
        try {
            if (editing) {
                const updated = await api.patch(`/resources/${editing._id || editing.id}`, values)
                setData((prev) => prev.map((r) => ((r._id || r.id) === (editing._id || editing.id) ? updated : r)))
                message.success('Resource updated')
            } else {
                await api.post('/resources', values)
                list.setPage(1)
                load()
                message.success('Resource added')
            }
            setModalOpen(false)
        } catch (err) {
            message.error(err.message)
        }
    }

    const remove = (r) =>
        confirmDelete({
            title: 'Delete resource?',
            content: `Remove "${r.title}" from the library?`,
            onOk: async () => {
                try {
                    await api.delete(`/resources/${r._id || r.id}`)
                    load()
                    message.success('Resource deleted')
                } catch (err) {
                    message.error(err.message)
                }
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
        onClick: async ({ key }) => {
            if (key === 'open') window.open(r.url, '_blank', 'noopener,noreferrer')
            else if (key === 'edit') openEdit(r)
            else if (key === 'delete') remove(r)
            else if (key === 'toggle') {
                const rid = r._id || r.id
                const next = r.status === 'active' ? 'inactive' : 'active'
                try {
                    const updated = await api.patch(`/resources/${rid}`, { status: next })
                    setData((prev) => prev.map((x) => ((x._id || x.id) === rid ? updated : x)))
                    message.success('Status updated')
                } catch (err) {
                    message.error(err.message)
                }
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
        { title: 'Updated', dataIndex: 'updatedAt', width: 120, render: (d) => <span className="text-text-muted">{d ? new Date(d).toLocaleDateString('en-CA') : '—'}</span> },
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
            <PageHeader title="Library Management" subtitle={`${total} resources`}>
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
                    options={[{ value: 'all', label: 'All categories' }, ...LIBRARY_CATEGORIES.map((c) => ({ value: c, label: c }))]}
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

            {loading ? (
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 6 }} /></div>
            ) : loadError ? (
                <div className="app-card"><SectionError title="Couldn't load resources" error={loadError} onRetry={load} /></div>
            ) : data.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No resources found"
                        description="Add your first Google Drive link or external resource."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add resource</Button>}
                    />
                </div>
            ) : view === 'table' ? (
                <DataTable columns={columns} dataSource={data} loading={list.fetching} pagination={false} scrollX={800} rowKey={(r) => r._id || r.id} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.map((r) => {
                        const Icon = CAT_ICON[r.category] || ReadOutlined
                        const rid = r._id || r.id
                        return (
                            <div key={rid} className="app-card app-card-hover animate-rise flex flex-col p-5">
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

            <Pager list={list} />

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
                        <Select options={LIBRARY_CATEGORIES.map((c) => ({ value: c, label: c }))} placeholder="Select category" />
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
