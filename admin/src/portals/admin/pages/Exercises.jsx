import { useMemo, useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App, Dropdown } from 'antd'
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    PlayCircleOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ModalTitle from '../../../components/common/ModalTitle'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import EmptyState from '../../../components/common/EmptyState'
import { confirmDelete } from '../../../utils/confirm'
import { useLibrary } from '../../../context/LibraryContext'
import { exerciseCategories } from '../../../services/exerciseLibrary'

// Admin exercise management. Exercises added/edited here feed the shared
// library that trainers read when building exercise plans.
export default function Exercises() {
    const { message } = App.useApp()
    const { exercises, addExercise, updateExercise, removeExercise } = useLibrary()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return exercises.filter((x) => {
            const matchQ = !q || x.name.toLowerCase().includes(q)
            const matchC = category === 'all' || x.category === category
            return matchQ && matchC
        })
    }, [exercises, search, category])

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue({ category: 'Chest', defaultSets: 3, defaultReps: '10', defaultRest: '60s' })
        setModalOpen(true)
    }
    const openEdit = (x) => {
        setEditing(x)
        form.setFieldsValue(x)
        setModalOpen(true)
    }

    const save = async () => {
        const v = await form.validateFields()
        if (editing) {
            updateExercise(editing.id, v)
            message.success('Exercise updated')
        } else {
            addExercise(v)
            message.success('Exercise added')
        }
        setModalOpen(false)
    }

    const remove = (x) =>
        confirmDelete({
            title: 'Delete exercise?',
            content: `Remove "${x.name}" from the library?`,
            onOk: () => {
                removeExercise(x.id)
                message.success('Exercise deleted')
            },
        })

    const rowMenu = (x) => ({
        items: [
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'edit') openEdit(x)
            else if (key === 'delete') remove(x)
        },
    })

    const columns = [
        {
            title: 'Exercise',
            dataIndex: 'name',
            render: (_, x) => (
                <div className="min-w-0">
                    <div className="truncate font-semibold text-text-primary">{x.name}</div>
                    <div className="text-xs text-text-muted">{x.category}</div>
                </div>
            ),
        },
        {
            title: 'Default',
            key: 'default',
            width: 200,
            render: (_, x) => <span className="text-text-secondary">{x.defaultSets} × {x.defaultReps} · Rest {x.defaultRest}</span>,
        },
        {
            title: 'Video',
            dataIndex: 'youtube',
            width: 90,
            render: (url) =>
                url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                        <PlayCircleOutlined /> Link
                    </a>
                ) : (
                    <span className="text-text-muted">—</span>
                ),
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, x) => (
                <Dropdown trigger={['click']} menu={rowMenu(x)}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Exercise Library" subtitle={`${filtered.length} exercises · shared with trainers`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add exercise
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search exercises…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 190 }}
                    options={[{ value: 'all', label: 'All categories' }, ...exerciseCategories.map((c) => ({ value: c, label: c }))]}
                />
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No exercises found"
                        description="Add an exercise with its default sets, reps and rest."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add exercise</Button>}
                    />
                </div>
            ) : (
                <DataTable columns={columns} dataSource={filtered} pageSize={10} scrollX={720} />
            )}

            <Modal
                title={
                    <ModalTitle
                        icon={<ThunderboltOutlined />}
                        title={editing ? 'Edit exercise' : 'Add exercise'}
                        subtitle={editing ? editing.name : 'Shared with every trainer'}
                    />
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add exercise'}
                centered
                width={520}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter a name' }]}>
                            <Input placeholder="e.g. Bench Press" />
                        </Form.Item>
                        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                            <Select options={exerciseCategories.map((c) => ({ value: c, label: c }))} />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="defaultSets" label="Sets" rules={[{ required: true, message: 'Required' }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="defaultReps" label="Reps" rules={[{ required: true, message: 'Required' }]}><Input placeholder="8-10" /></Form.Item>
                        <Form.Item name="defaultRest" label="Rest"><Input placeholder="90s" /></Form.Item>
                    </div>
                    <Form.Item name="youtube" label="YouTube URL" rules={[{ type: 'url', message: 'Enter a valid URL' }]}>
                        <Input placeholder="https://youtube.com/watch?v=…" />
                    </Form.Item>
                    <Form.Item name="notes" label="Instructions">
                        <Input.TextArea rows={2} placeholder="Form cues, tempo, etc." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
