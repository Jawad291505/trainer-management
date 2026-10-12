import { useMemo, useState } from 'react'
import { Button, Segmented, Skeleton, Dropdown, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined, BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import SectionError from '../../../components/feedback/SectionError'
import YouTubePreview from '../../../components/common/YouTubePreview'
import { useLibrary } from '../../../context/LibraryContext'
import { confirmDelete } from '../../../utils/confirm'
import TechniqueFormModal from '../components/TechniqueFormModal'

const SCOPES = [
    { value: 'all', label: 'All' },
    { value: 'mine', label: 'My techniques' },
    { value: 'shared', label: 'Shared library' },
]

// The trainer's view of the Techniques Library: the shared techniques published
// by the admin (read-only) plus their own, which they can add, edit and delete.
// Techniques are attached to exercises in the Exercise Plans builder.
export default function Techniques() {
    const { message } = App.useApp()
    const { techniques, removeTechnique, loading, error, reload } = useLibrary(['techniques'])
    const [search, setSearch] = useState('')
    const [scope, setScope] = useState('all')
    const [modal, setModal] = useState(null) // { technique } | null

    const visible = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return techniques.filter((t) =>
            (scope === 'all' || (scope === 'shared') === !!t.isMaster) &&
            (!needle || `${t.title} ${t.instructions}`.toLowerCase().includes(needle)),
        )
    }, [techniques, search, scope])

    const mineCount = techniques.filter((t) => !t.isMaster).length

    const remove = (t) =>
        confirmDelete({
            title: 'Delete technique?',
            content: `"${t.title}" will be removed from your library. Plans that already use it keep their copy.`,
            onOk: async () => {
                try {
                    await removeTechnique(t._id || t.id)
                    message.success('Technique deleted')
                } catch (err) {
                    message.error(err.message || 'Failed to delete technique')
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
            if (key === 'edit') setModal({ technique: t })
            else if (key === 'delete') remove(t)
        },
    })

    const addButton = (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal({ technique: null })}>New technique</Button>
    )

    return (
        <div>
            <PageHeader
                title="Techniques"
                subtitle={loading ? 'Loading techniques…' : `${techniques.length - mineCount} shared · ${mineCount} of your own`}
            >
                {addButton}
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search techniques…" />
                <Segmented value={scope} onChange={setScope} options={SCOPES} className="self-start sm:self-auto" />
            </FilterBar>

            {loading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => <div key={i} className="app-card p-5"><Skeleton active paragraph={{ rows: 4 }} /></div>)}
                </div>
            ) : error ? (
                <div className="app-card"><SectionError title="Couldn't load the techniques library" error={error} onRetry={reload} /></div>
            ) : visible.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        icon={<BulbOutlined />}
                        title={techniques.length === 0 ? 'No techniques yet' : 'No techniques found'}
                        description={
                            techniques.length === 0
                                ? 'Create a technique with a title, instructions and an optional YouTube demo, then attach it to exercises in your plans.'
                                : scope === 'mine' && mineCount === 0
                                    ? "You haven't created any techniques of your own yet."
                                    : 'Try a different search or filter.'
                        }
                        action={techniques.length === 0 || (scope === 'mine' && mineCount === 0) ? addButton : null}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((t) => (
                        <div key={t._id || t.id} className="app-card flex flex-col p-5">
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="break-words font-bold text-text-primary">{t.title}</div>
                                    <span
                                        className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                        style={t.isMaster
                                            ? { background: 'var(--color-surface-secondary)', color: 'var(--color-text-secondary)' }
                                            : { background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
                                    >
                                        {t.isMaster ? 'Shared library' : 'My technique'}
                                    </span>
                                </div>
                                {t.editable && (
                                    <Dropdown trigger={['click']} menu={rowMenu(t)}>
                                        <Button type="text" icon={<MoreOutlined />} aria-label="Technique actions" />
                                    </Dropdown>
                                )}
                            </div>
                            <p className="mb-3 line-clamp-4 whitespace-pre-line text-sm text-text-secondary" title={t.instructions}>{t.instructions}</p>
                            {t.youtube && <div className="mt-auto">
                                <YouTubePreview url={t.youtube} title={t.title} />
                                <a
                                    href={t.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold"
                                    style={{ color: 'var(--color-danger)' }}
                                >
                                    <PlayCircleOutlined /> Open on YouTube
                                </a>
                            </div>}
                        </div>
                    ))}
                </div>
            )}

            <TechniqueFormModal open={!!modal} technique={modal?.technique || null} onClose={() => setModal(null)} />
        </div>
    )
}
