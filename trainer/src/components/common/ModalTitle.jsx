// Premium modal header: an icon chip + title with an optional one-line subtitle.
// Pass as the Modal's `title` prop:  title={<ModalTitle icon={<AppleOutlined />} title="Add food" subtitle="…" />}
export default function ModalTitle({ icon, title, subtitle }) {
    return (
        <div className="modal-head">
            {icon && <span className="modal-head-icon">{icon}</span>}
            <div className="min-w-0">
                <div className="modal-head-title">{title}</div>
                {subtitle && <div className="modal-head-sub">{subtitle}</div>}
            </div>
        </div>
    )
}
