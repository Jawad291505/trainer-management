import { Dropdown, Button, Rate } from 'antd'
import {
    MoreOutlined,
    EyeOutlined,
    EditOutlined,
    PlusOutlined,
    MinusOutlined,
    StopOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    SyncOutlined,
} from '@ant-design/icons'
import AffiliationTag from './AffiliationTag'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import CapacityBar from '../../../components/common/CapacityBar'

// Premium trainer summary card used on the Trainers page grid.
// `showType` surfaces the affiliation badge (in-house / for a member /
// independent) — pass it only where the distinction is actually informative (the
// admin Trainers page); a Member viewing their own trainers, or a single Member's
// detail page, already knows they're all that member's, so it's noise there.
// `showRevenue` is off for Members — revenue is Admin-only data for them.
export default function TrainerCard({ trainer, onAction, showType = false, showRevenue = true }) {
    const atCapacity = trainer.clients >= trainer.capacity
    const isActive = trainer.status === 'active'

    const menu = {
        items: [
            { key: 'view', icon: <EyeOutlined />, label: 'View details' },
            { key: 'edit', icon: <EditOutlined />, label: 'Edit trainer' },
            { key: 'increase', icon: <PlusOutlined />, label: 'Increase capacity' },
            { key: 'decrease', icon: <MinusOutlined />, label: 'Decrease capacity' },
            // Outsourced trainers pay for their own plan, so Admin can record a renewal.
            ...(showType && trainer.affiliation === 'outsourced'
                ? [{ key: 'renew', icon: <SyncOutlined />, label: 'Renew subscription' }]
                : []),
            { type: 'divider' },
            {
                key: 'toggle',
                icon: isActive ? <StopOutlined /> : <CheckCircleOutlined />,
                label: isActive ? 'Deactivate' : 'Activate',
            },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => onAction(key, trainer),
    }

    return (
        <div className="app-card app-card-hover animate-rise flex flex-col p-5">
            <div className="flex items-start justify-between">
                <button
                    className="flex items-center gap-3 text-left"
                    onClick={() => onAction('view', trainer)}
                >
                    <UserAvatar name={trainer.name} color={trainer.avatarColor} size={48} />
                    <div>
                        <div className="font-bold text-text-primary transition-colors hover:text-primary">
                            {trainer.name}
                        </div>
                        <div className="text-xs text-text-muted">{trainer.specialization}</div>
                    </div>
                </button>
                <Dropdown trigger={['click']} menu={menu}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            </div>

            <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <StatusBadge status={trainer.status} />
                    {showType && <AffiliationTag trainer={trainer} />}
                </div>
                <div className="flex items-center gap-1">
                    <Rate disabled allowHalf value={trainer.rating} count={5} style={{ fontSize: 12 }} />
                    <span className="text-xs font-semibold text-text-secondary">{trainer.rating}</span>
                </div>
            </div>

            <div className="mt-4">
                <div className="mb-1 text-xs font-semibold text-text-secondary">Client capacity</div>
                <CapacityBar current={trainer.clients} max={trainer.capacity} />
                {atCapacity && (
                    <div className="mt-2 rounded-lg px-2.5 py-1.5 text-xs font-medium" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>
                        At full capacity — increase to assign more clients.
                    </div>
                )}
            </div>

            <div className={`mt-4 grid gap-2 border-t pt-4 text-center ${showRevenue ? 'grid-cols-3' : 'grid-cols-2'}`} style={{ borderColor: 'var(--color-border)' }}>
                <div>
                    <div className="text-base font-extrabold text-text-primary">{trainer.clients}</div>
                    <div className="text-[11px] text-text-muted">Clients</div>
                </div>
                <div>
                    <div className="text-base font-extrabold text-text-primary">{Math.max(0, trainer.capacity - trainer.clients)}</div>
                    <div className="text-[11px] text-text-muted">Available</div>
                </div>
                {showRevenue && (
                    <div>
                        <div className="text-base font-extrabold text-text-primary">${(trainer.revenue / 1000).toFixed(0)}k</div>
                        <div className="text-[11px] text-text-muted">Revenue</div>
                    </div>
                )}
            </div>
        </div>
    )
}
