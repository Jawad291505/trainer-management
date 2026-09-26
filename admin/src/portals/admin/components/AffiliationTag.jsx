import { Tag } from 'antd'

// Which team a trainer belongs to: in-house (Admin's own), for a Member, or an
// independent trainer (own plan, own clients).
const AFFILIATION = {
    admin: { color: 'default', label: () => 'In-house' },
    member: { color: 'purple', label: (t) => `For member${t.memberName ? ` — ${t.memberName}` : ''}` },
    outsourced: { color: 'geekblue', label: () => 'Independent' },
}

export default function AffiliationTag({ trainer }) {
    const a = AFFILIATION[trainer.affiliation] || AFFILIATION.admin
    return <Tag color={a.color} style={{ borderRadius: 999, margin: 0 }}>{a.label(trainer)}</Tag>
}
