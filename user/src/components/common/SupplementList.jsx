import { useState } from 'react'
import { ExperimentOutlined, LinkOutlined, ExportOutlined } from '@ant-design/icons'

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

// Read-only supplements block for a meal card — its own labelled section, kept
// visually apart from the meal's food items.
export default function SupplementList({ supplements, className = '' }) {
    if (!supplements?.length) return null
    return (
        <div className={`border-t pt-3 ${className}`} style={{ borderColor: 'var(--color-border)' }}>
            <div className="mb-2 flex items-center gap-1 text-xs font-semibold text-text-muted">
                <ExperimentOutlined /> Supplements
            </div>
            <div className="flex flex-col gap-2">
                {supplements.map((s, i) => (
                    <div key={s.id || i} className="rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-secondary)' }}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium text-text-primary">{s.name}</span>
                            {s.dosage && <span className="shrink-0 text-text-muted">{s.dosage}</span>}
                        </div>
                        {s.url && (
                            <div className="mt-2">
                                <SupplementLinkCard url={s.url} preview={s.preview} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
