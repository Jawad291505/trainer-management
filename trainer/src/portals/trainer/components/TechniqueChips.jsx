import { BulbOutlined, PlayCircleOutlined } from '@ant-design/icons'

// Compact pills for the library techniques attached to an exercise or a link
// group. Each opens its video; the tooltip carries the instructions.
export default function TechniqueChips({ techniques, className = '' }) {
    if (!techniques?.length) return null
    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {techniques.map((t, i) => {
                const style = { background: 'var(--color-info-soft)', color: 'var(--color-info)' }
                const cls = 'inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold'
                const body = (
                    <>
                        {t.youtube ? <PlayCircleOutlined /> : <BulbOutlined />}
                        <span className="truncate">{t.title}</span>
                    </>
                )
                return t.youtube ? (
                    <a key={t._id || t.technique || i} href={t.youtube} target="_blank" rel="noopener noreferrer" className={cls} style={style} title={t.instructions}>
                        {body}
                    </a>
                ) : (
                    <span key={t._id || t.technique || i} className={cls} style={style} title={t.instructions}>{body}</span>
                )
            })}
        </div>
    )
}
