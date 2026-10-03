import { useEffect, useState } from 'react'
import { Button, Input } from 'antd'
import { PlusOutlined, DeleteOutlined, LinkOutlined, LoadingOutlined, ExperimentOutlined } from '@ant-design/icons'
import { api } from '../../../services/api'
import { SupplementLinkCard } from '../../../components/common/SupplementList'

let supplementSeq = 1

export const newSupplement = () => ({ id: `S${supplementSeq++}`, name: '', dosage: '', url: '', preview: null })

export const isHttpUrl = (value) => {
    try {
        const u = new URL(value)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}

// First problem in a supplement list (for the meal form's submit), or null.
export function supplementsError(supplements) {
    for (const s of supplements) {
        if (!s.name.trim()) return 'Give each supplement a name, or remove the empty one'
        if (s.url.trim() && !isHttpUrl(s.url.trim())) return `The link for "${s.name.trim()}" isn't a valid URL`
    }
    return null
}

// What gets stored on the meal: trimmed fields, and the preview only when it
// was fetched for the link as it now stands.
export const cleanSupplements = (supplements) =>
    supplements.map((s) => {
        const url = s.url.trim()
        return { id: s.id, name: s.name.trim(), dosage: s.dosage.trim(), url, preview: url && s.preview?.url === url ? s.preview : null }
    })

// One supplement: name, dosage, and an optional purchase/reference link whose
// metadata is fetched (debounced) as soon as the URL is valid.
function SupplementRow({ item, onPatch, onRemove, showErrors }) {
    const url = item.url.trim()
    const validUrl = isHttpUrl(url)
    const hasPreview = validUrl && item.preview?.url === url
    const [fetching, setFetching] = useState(false)

    useEffect(() => {
        if (!validUrl || hasPreview) {
            setFetching(false)
            return undefined
        }
        let cancelled = false
        setFetching(true)
        const timer = setTimeout(() => {
            api.get(`/link-preview?url=${encodeURIComponent(url)}`, { ttl: 5 * 60_000 })
                .then((p) => ({ title: p.title, description: p.description, image: p.image, siteName: p.siteName }))
                // No metadata available — keep the link, shown as a plain site + URL card.
                .catch(() => ({ title: '', description: '', image: null, siteName: '' }))
                .then((preview) => {
                    if (cancelled) return
                    onPatch({ preview: { ...preview, url } })
                    setFetching(false)
                })
        }, 600)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, validUrl, hasPreview])

    const nameMissing = showErrors && !item.name.trim()
    const urlInvalid = !!url && !validUrl

    return (
        <div className="rounded-xl border p-3" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-start gap-2">
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                        value={item.name}
                        onChange={(e) => onPatch({ name: e.target.value })}
                        placeholder="Supplement name"
                        maxLength={120}
                        status={nameMissing ? 'error' : undefined}
                        aria-label="Supplement name"
                    />
                    <Input
                        value={item.dosage}
                        onChange={(e) => onPatch({ dosage: e.target.value })}
                        placeholder="Quantity / dosage (optional)"
                        maxLength={120}
                        aria-label="Quantity or dosage"
                    />
                    <Input
                        className="sm:col-span-2"
                        value={item.url}
                        onChange={(e) => onPatch({ url: e.target.value })}
                        placeholder="Purchase or reference link (optional)"
                        prefix={<LinkOutlined className="text-text-muted" />}
                        suffix={fetching ? <LoadingOutlined className="text-text-muted" /> : <span />}
                        status={urlInvalid ? 'error' : undefined}
                        allowClear
                        inputMode="url"
                        aria-label="Purchase or reference link"
                    />
                </div>
                <Button type="text" danger icon={<DeleteOutlined />} onClick={onRemove} aria-label="Remove supplement" />
            </div>
            {nameMissing && <div className="mt-1 text-xs text-danger">Enter a name</div>}
            {urlInvalid && <div className="mt-1 text-xs text-danger">Enter a full link, starting with https://</div>}
            {fetching && <div className="mt-2 text-xs text-text-muted">Fetching link preview…</div>}
            {hasPreview && (
                <div className="mt-2">
                    <SupplementLinkCard key={url} url={url} preview={item.preview} />
                </div>
            )}
        </div>
    )
}

// The meal form's supplements section — add, edit and remove any number of
// supplements. Controlled: `value` is the list, `onChange` takes a list or an
// updater function (a state setter fits directly).
export default function SupplementsEditor({ value, onChange, showErrors = false }) {
    const patch = (id, fields) => onChange((prev) => prev.map((s) => (s.id === id ? { ...s, ...fields } : s)))
    const remove = (id) => onChange((prev) => prev.filter((s) => s.id !== id))
    const add = () => onChange((prev) => [...prev, newSupplement()])

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
                        <ExperimentOutlined /> Supplements
                        {value.length > 0 && <span className="font-normal text-text-muted">({value.length})</span>}
                    </div>
                    <div className="text-xs text-text-muted">Taken with this meal — kept separate from its foods and macros.</div>
                </div>
                {value.length > 0 && <Button size="small" icon={<PlusOutlined />} onClick={add}>Add</Button>}
            </div>
            {value.length === 0 ? (
                <Button type="dashed" block icon={<PlusOutlined />} onClick={add}>Add supplement</Button>
            ) : (
                <div className="flex flex-col gap-2">
                    {value.map((s) => (
                        <SupplementRow key={s.id} item={s} onPatch={(fields) => patch(s.id, fields)} onRemove={() => remove(s.id)} showErrors={showErrors} />
                    ))}
                </div>
            )}
        </div>
    )
}
