import { useState } from 'react'
import { ExperimentOutlined, LinkOutlined, ExportOutlined, CheckOutlined, LoadingOutlined } from '@ant-design/icons'

const hostOf = (url) => {
    try { return new URL(url).hostname.replace(/^www\./i, '') } catch { return '' }
}

// Link card for a supplement's purchase/reference URL: product image, title,
// source site and the URL itself. `preview` is the stored metadata from
// GET /link-preview; without it (or if the image fails) it degrades to a plain
// site + URL card.
export function SupplementLinkCard({ url, preview }) {
    const [imageFailed, setImageFailed] = useState(false)
    if (!url) return null
    const site = preview?.siteName || hostOf(url)
    const image = !imageFailed && preview?.image
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border p-2 no-underline transition-colors hover:border-primary"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
        >
            <span
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md text-text-muted"
                style={{ background: 'var(--color-surface-secondary)' }}
            >
                {image ? (
                    <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
                ) : (
                    <LinkOutlined />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text-primary">{preview?.title || site || url}</span>
                {site && <span className="block truncate text-[11px] font-medium text-text-secondary">{site}</span>}
                <span className="block truncate text-[11px] text-text-muted">{url}</span>
            </span>
            <ExportOutlined className="shrink-0 pr-1 text-xs text-text-muted" />
        </a>
    )
}

// Supplements block for a meal card — its own labelled section, kept visually
// apart from the meal's food items.
//   taken     — optional boolean[] (by index): shows each one as taken / not taken.
//   onToggle  — optional (index) => void: makes each row a checkbox the client ticks.
//   busyIndex — the index currently saving; `disabled` blocks ticking altogether.
export default function SupplementList({ supplements, className = '', taken = null, onToggle, busyIndex = null, disabled = false }) {
    if (!supplements?.length) return null
    const takenCount = taken ? supplements.filter((_, i) => taken[i]).length : 0
    return (
        <div className={`border-t pt-3 ${className}`} style={{ borderColor: 'var(--color-border)' }}>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-text-muted">
                <span className="flex items-center gap-1"><ExperimentOutlined /> Supplements</span>
                {taken && <span>{takenCount}/{supplements.length} taken</span>}
            </div>
            <div className="flex flex-col gap-2">
                {supplements.map((s, i) => {
                    const on = !!taken?.[i]
                    const saving = busyIndex === i
                    const blocked = disabled || busyIndex != null
                    const head = (
                        <>
                            {taken && (
                                <span
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors"
                                    style={{
                                        borderColor: on ? 'var(--color-success)' : 'var(--color-border-strong)',
                                        background: on ? 'var(--color-success)' : 'transparent',
                                        color: '#fff',
                                    }}
                                >
                                    {saving
                                        ? <LoadingOutlined style={{ fontSize: 11, color: on ? '#fff' : 'var(--color-text-muted)' }} />
                                        : on && <CheckOutlined style={{ fontSize: 11 }} />}
                                </span>
                            )}
                            <span className={`min-w-0 flex-1 truncate font-medium ${on && onToggle ? 'text-text-muted line-through' : 'text-text-primary'}`}>{s.name}</span>
                            {s.dosage && <span className="shrink-0 text-text-muted">{s.dosage}</span>}
                        </>
                    )
                    return (
                        <div
                            key={s.id || i}
                            className="rounded-lg px-3 py-2 transition-colors"
                            style={{ background: on ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)', opacity: blocked && !saving && onToggle ? 0.6 : 1 }}
                        >
                            {onToggle ? (
                                <button
                                    type="button"
                                    onClick={() => onToggle(i)}
                                    disabled={blocked}
                                    aria-pressed={on}
                                    className="flex w-full items-center gap-3 text-left text-sm"
                                >
                                    {head}
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 text-sm">{head}</div>
                            )}
                            {s.url && (
                                <div className="mt-2">
                                    <SupplementLinkCard url={s.url} preview={s.preview} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
