import { useState } from 'react'
import { Select, Button, Modal, Form, Input, InputNumber, App, Dropdown, Skeleton } from 'antd'
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
import Pager from '../../../components/common/Pager'
import { usePagedList } from '../../../hooks/usePagedList'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import { confirmDelete } from '../../../utils/confirm'
import { useLibrary, normalizeEx } from '../../../context/LibraryContext'
import { exerciseCategories, exerciseTechniques, getTechnique } from '../../../services/exerciseLibrary'

// Admin exercise management. Exercises added/edited here feed the shared
// library that trainers read when building exercise plans.
export default function Exercises() {
    const { message } = App.useApp()
    // Mutations go through the shared library context; the visible page (search,
    // category filter and paging) is fetched from the backend.
    const { addExercise, updateExercise, removeExercise } = useLibrary([])
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const list = usePagedList('/exercises', { params: { category }, search, pageSize: 10, transform: normalizeEx })
    const { items: exercises, total, loading, error, reload } = list
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()
    const technique = Form.useWatch('technique', form)

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue({ category: 'Chest', defaultSets: 3, defaultReps: '10', defaultRest: '60s', technique: 'standard' })
        setModalOpen(true)
    }
    const openEdit = (x) => {
        setEditing(x)
        form.setFieldsValue({ ...x, technique: x.technique || 'standard' })
        setModalOpen(true)
    }

    const save = async () => {
        const v = await form.validateFields()
        try {
            if (editing) {
                await updateExercise(editing.id, v)
                reload()
                message.success('Exercise updated')
            } else {
                await addExercise(v)
                list.setPage(1)
                reload()
                message.success('Exercise added')
            }
            setModalOpen(false)
        } catch (err) {
            message.error(err.message || 'Failed to save')
        }
    }

    const remove = (x) =>
        confirmDelete({
            title: 'Delete exercise?',
            content: `Remove "${x.name}" from the library?`,
            onOk: async () => {
                try {
                    await removeExercise(x.id)
                    reload()
                    message.success('Exercise deleted')
                } catch (err) {
                    message.error(err.message || 'Failed to delete')
                }
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
                    <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-text-primary">{x.name}</span>
                        {x.technique && x.technique !== 'standard' && (
                            <span
                                className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold"
                                style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
                                title={getTechnique(x.technique).description}
                            >
                                {getTechnique(x.technique).label}
                            </span>
                        )}
                    </div>
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
            <PageHeader title="Exercise Library" subtitle={loading ? 'Loading exercises…' : `${total} exercises · shared with trainers`}>
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

            {loading ? (
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 8 }} /></div>
            ) : error ? (
                <div className="app-card"><SectionError title="Couldn't load the exercise library" error={error} onRetry={reload} /></div>
            ) : exercises.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No exercises found"
                        description="Add an exercise with its default sets, reps and rest."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add exercise</Button>}
                    />
                </div>
            ) : (
                <>
                    <DataTable columns={columns} dataSource={exercises} loading={list.fetching} pagination={false} scrollX={720} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </>
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
                    <Form.Item
                        name="technique"
                        label="Technique"
                        initialValue="standard"
                        tooltip="How the set is performed"
                        extra={technique && technique !== 'standard' ? getTechnique(technique).description : null}
                    >
                        <Select options={exerciseTechniques.map((t) => ({ value: t.key, label: t.label }))} />
                    </Form.Item>
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
