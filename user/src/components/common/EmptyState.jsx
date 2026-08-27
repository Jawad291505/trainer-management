import { InboxOutlined } from '@ant-design/icons'

// Friendly empty state used by tables, lists and cards.
export default function EmptyState({ icon, title = 'Nothing here yet', description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}
            >
                {icon || <InboxOutlined />}
            </div>
            <h3 className="m-0 text-base font-bold text-text-primary">{title}</h3>
            {description && <p className="mt-1 mb-0 max-w-sm text-sm text-text-secondary">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    )
}
