import { useState } from 'react'
import { Button, Modal, Form, Input, App, Dropdown, Skeleton } from 'antd'
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    PlayCircleOutlined,
    BulbOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ModalTitle from '../../../components/common/ModalTitle'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import Pager from '../../../components/common/Pager'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import YouTubePreview from '../../../components/common/YouTubePreview'
import { usePagedList } from '../../../hooks/usePagedList'
import { confirmDelete } from '../../../utils/confirm'
import { youtubeRule } from '../../../utils/youtube'
import { api } from '../../../services/api'

const normalize = (t) => ({ id: t._id || t.id, title: t.title, instructions: t.instructions, youtube: t.youtube, updatedAt: t.updatedAt })

// Admin Techniques Library. Techniques added here are shared with every trainer,
// who attach them to exercises in a client's plan; trainers can't change them.
export default function Techniques() {
    const { message } = App.useApp()
    const [search, setSearch] = useState('')
    const list = usePagedList('/techniques', { search, pageSize: 10, transform: normalize })
    const { items: techniques, total, loading, error, reload } = list
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [saving, setSaving] = useState(false)
    const [form] = Form.useForm()
    const youtube = Form.useWatch('youtube', form)

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        setModalOpen(true)
    }
    const openEdit = (t) => {
        setEditing(t)
        form.resetFields()
        form.setFieldsValue({ title: t.title, instructions: t.instructions, youtube: t.youtube })
        setModalOpen(true)
    }

    const save = async () => {
        const fields = await form.validateFields()
        const v = { ...fields, youtube: (fields.youtube || '').trim() } // blank = no video
        setSaving(true)
        try {
            if (editing) {
                await api.patch(`/techniques/${editing.id}`, v)
                message.success('Technique updated')
            } else {
                await api.post('/techniques', v)
                list.setPage(1)
                message.success('Technique added')
            }
            reload()
            setModalOpen(false)
        } catch (err) {
            // A duplicate title comes back as a field-level conflict.
            if (err.status === 409) form.setFields([{ name: 'title', errors: [err.message] }])
            else message.error(err.message || 'Failed to save')
        } finally {
            setSaving(false)
        }
    }

    const remove = (t) =>
        confirmDelete({
            title: 'Delete technique?',
            content: `"${t.title}" will be removed from the shared library. Workout plans that already use it keep their copy.`,
            onOk: async () => {
                try {
                    await api.delete(`/techniques/${t.id}`)
                    reload()
                    message.success('Technique deleted')
                } catch (err) {
                    message.error(err.message || 'Failed to delete')
                }
            },
        })

    const rowMenu = (t) => ({
        items: [
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'edit') openEdit(t)
            else if (key === 'delete') remove(t)
        },
    })

    const columns = [
        {
            title: 'Technique',
            dataIndex: 'title',
            render: (_, t) => (
                <div className="min-w-0">
                    <div className="font-semibold text-text-primary">{t.title}</div>
                    <div className="line-clamp-2 whitespace-pre-line text-xs text-text-muted" title={t.instructions}>{t.instructions}</div>
                </div>
            ),
        },
        {
            title: 'Video',
            dataIndex: 'youtube',
            width: 100,
            render: (url) =>
                url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                        <PlayCircleOutlined /> Watch
                    </a>
                ) : (
                    <span className="text-text-muted">—</span>
                ),
        },
        {
            title: 'Updated',
            dataIndex: 'updatedAt',
            width: 130,
            render: (d) => <span className="text-text-secondary">{d ? new Date(d).toLocaleDateString('en-CA') : '—'}</span>,
        },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, t) => (
                <Dropdown trigger={['click']} menu={rowMenu(t)}>
                    <Button type="text" icon={<MoreOutlined />} aria-label="Technique actions" />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <PageHeader title="Techniques Library" subtitle={loading ? 'Loading techniques…' : `${total} techniques · shared with trainers`}>
                <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add technique
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search techniques…" />
            </FilterBar>

            {loading ? (
                <div className="app-card p-5"><Skeleton active paragraph={{ rows: 8 }} /></div>
            ) : error ? (
                <div className="app-card"><SectionError title="Couldn't load the techniques library" error={error} onRetry={reload} /></div>
            ) : techniques.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        icon={<BulbOutlined />}
                        title={search.trim() ? 'No techniques found' : 'No techniques yet'}
                        description={search.trim() ? 'Try a different search.' : 'Add a technique with a title, instructions and an optional YouTube demo for trainers to reuse.'}
                        action={search.trim() ? null : <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add technique</Button>}
                    />
                </div>
            ) : (
                <>
                    <DataTable columns={columns} dataSource={techniques} loading={list.fetching} pagination={false} scrollX={640} />
                    <Pager list={list} pageSizeOptions={[10, 20, 50]} />
                </>
            )}

            <Modal
                title={
                    <ModalTitle
                        icon={<BulbOutlined />}
                        title={editing ? 'Edit technique' : 'Add technique'}
                        subtitle={editing ? 'Plans that already use it keep their current version' : 'Shared with every trainer'}
                    />
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add technique'}
                confirmLoading={saving}
                centered
                width={520}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: 'Enter a title' }, { max: 120, message: 'Keep it under 120 characters' }]}>
                        <Input placeholder="e.g. Tempo squat — 3 second descent" />
                    </Form.Item>
                    <Form.Item name="instructions" label="Instructions" rules={[{ required: true, whitespace: true, message: 'Enter the instructions' }, { max: 5000, message: 'Keep it under 5000 characters' }]}>
                        <Input.TextArea rows={5} placeholder="Step-by-step cues the client should follow." />
                    </Form.Item>
                    <Form.Item name="youtube" label="YouTube URL (optional)" rules={[youtubeRule]} className="mb-2">
                        <Input placeholder="https://youtube.com/watch?v=…" inputMode="url" />
                    </Form.Item>
                    <YouTubePreview url={youtube} title="Technique video" />
                </Form>
            </Modal>
        </div>
    )
}
