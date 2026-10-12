import { useMemo } from 'react'
import { Select, Spin, Button } from 'antd'
import { PlayCircleOutlined, CloseOutlined, SyncOutlined } from '@ant-design/icons'
import { useLibrary } from '../../../context/LibraryContext'

const libId = (t) => String(t._id || t.id)
const fresh = (t) => ({ technique: libId(t), title: t.title, instructions: t.instructions, youtube: t.youtube })
const differs = (snap, lib) => snap.title !== lib.title || (snap.instructions || '') !== lib.instructions || (snap.youtube || '') !== lib.youtube

// Searchable picker for Techniques Library entries — the shared (admin) library
// and the trainer's own, in one list. A controlled antd form field.
//
// `value` is a list of technique copies: { _id?, technique, title, instructions, youtube }.
// Entries that came from a saved plan carry `_id` and keep the wording they were
// saved with, even if the library technique has since been edited or deleted;
// "Use latest" swaps one for the current library version.
export default function TechniquePicker({ value, onChange, placeholder = 'Search techniques…', max = 6 }) {
    const { techniques, loading, error, reload } = useLibrary(['techniques'])
    const selected = useMemo(() => value || [], [value])
    const byId = useMemo(() => new Map(techniques.map((t) => [libId(t), t])), [techniques])

    const options = useMemo(() => {
        const opt = (t) => ({ value: libId(t), label: t.title, search: `${t.title} ${t.instructions}`.toLowerCase() })
        const mine = techniques.filter((t) => !t.isMaster).map(opt)
        const shared = techniques.filter((t) => t.isMaster).map(opt)
        // Copies whose library technique is gone stay selectable so they aren't lost on save.
        const orphans = selected
            .filter((s) => !byId.has(String(s.technique)))
            .map((s) => ({ value: String(s.technique), label: s.title, search: s.title.toLowerCase() }))
        return [
            ...(mine.length ? [{ label: 'My techniques', options: mine }] : []),
            ...(shared.length ? [{ label: 'Shared library', options: shared }] : []),
            ...(orphans.length ? [{ label: 'No longer in the library', options: orphans }] : []),
        ]
    }, [techniques, selected, byId])

    const setIds = (ids) => {
        const next = ids
            .map((id) => selected.find((s) => String(s.technique) === id) || (byId.has(id) ? fresh(byId.get(id)) : null))
            .filter(Boolean)
        onChange?.(next)
    }
    const remove = (id) => onChange?.(selected.filter((s) => String(s.technique) !== id))
    const refresh = (id) => onChange?.(selected.map((s) => (String(s.technique) === id ? fresh(byId.get(id)) : s)))

    return (
        <div>
            <Select
                mode="multiple"
                showSearch
                allowClear
                value={selected.map((s) => String(s.technique))}
                onChange={setIds}
                options={options}
                placeholder={placeholder}
                maxCount={max}
                maxTagCount="responsive"
                filterOption={(input, option) => (option?.search || '').includes(input.trim().toLowerCase())}
                loading={loading}
                style={{ width: '100%' }}
                notFoundContent={
                    loading ? (
                        <div className="py-3 text-center"><Spin size="small" /></div>
                    ) : error ? (
                        <div className="py-3 text-center text-xs text-text-muted">
                            Couldn't load techniques. <Button type="link" size="small" onClick={reload}>Try again</Button>
                        </div>
                    ) : (
                        <div className="py-3 text-center text-xs text-text-muted">
                            {techniques.length ? 'No technique matches your search.' : 'No techniques yet — add one from the Techniques page.'}
                        </div>
                    )
                }
            />

            {selected.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5">
                    {selected.map((s) => {
                        const id = String(s.technique)
                        const lib = byId.get(id)
                        const outdated = lib && differs(s, lib)
                        return (
                            <div key={id} className="flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-semibold text-text-primary">{s.title}</div>
                                    {s.instructions && <div className="line-clamp-2 text-xs text-text-muted">{s.instructions}</div>}
                                    {outdated && (
                                        <button
                                            type="button"
                                            onClick={() => refresh(id)}
                                            className="mt-1 inline-flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-semibold"
                                            style={{ color: 'var(--color-primary)' }}
                                        >
                                            <SyncOutlined /> Edited in the library since — use latest
                                        </button>
                                    )}
                                </div>
                                {s.youtube && (
                                    <a href={s.youtube} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${s.title}`} style={{ color: 'var(--color-danger)' }}>
                                        <PlayCircleOutlined />
                                    </a>
                                )}
                                <Button size="small" type="text" icon={<CloseOutlined />} aria-label={`Remove ${s.title}`} onClick={() => remove(id)} />
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
