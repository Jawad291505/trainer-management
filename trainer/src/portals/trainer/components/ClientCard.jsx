import { useNavigate } from 'react-router-dom'
import { Progress, Dropdown, Button } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    AppleOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    WarningFilled,
} from '@ant-design/icons'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'

// Client summary card for the trainer "My Clients" mobile/grid view.
export default function ClientCard({ client }) {
    const navigate = useNavigate()

    const menu = {
        items: [
            { key: 'view', icon: <EyeOutlined />, label: 'View client' },
            { key: 'diet', icon: <AppleOutlined />, label: 'Diet plan' },
            { key: 'exercise', icon: <ThunderboltOutlined />, label: 'Exercise plan' },
            { key: 'chat', icon: <MessageOutlined />, label: 'Message' },
        ],
        onClick: ({ key }) => {
            if (key === 'view') navigate(`/clients/${client.id}`)
            else if (key === 'chat') navigate('/messages')
            else navigate(`/clients/${client.id}`)
        },
    }

    return (
        <div className="app-card app-card-hover flex flex-col p-5">
            <div className="flex items-start justify-between">
                <button className="flex items-center gap-3 text-left" onClick={() => navigate(`/clients/${client.id}`)}>
                    <UserAvatar name={client.name} color={client.avatarColor} size={46} />
                    <div>
                        <div className="font-bold text-text-primary transition-colors hover:text-primary">{client.name}</div>
                        <div className="text-xs text-text-muted">{client.goal} · {client.plan}</div>
                    </div>
                </button>
                <Dropdown trigger={['click']} menu={menu}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            </div>

            <div className="mt-3 flex items-center justify-between">
                <StatusBadge status={client.status} />
                {client.attention && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--color-warning)' }}>
                        <WarningFilled /> Needs attention
                    </span>
                )}
            </div>

            <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-secondary">Progress</span>
                    <span className="font-bold text-text-primary">{client.progress}%</span>
                </div>
                <Progress percent={client.progress} showInfo={false} strokeColor="var(--color-primary)" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-3 text-xs" style={{ borderColor: 'var(--color-border)' }}>
                <div>
                    <div className="text-text-muted">Last follow-up</div>
                    <div className="font-semibold text-text-primary">{client.lastFollowUp}</div>
                </div>
                <div>
                    <div className="text-text-muted">Next follow-up</div>
                    <div className="font-semibold text-text-primary">{client.nextFollowUp}</div>
                </div>
            </div>
        </div>
    )
}
