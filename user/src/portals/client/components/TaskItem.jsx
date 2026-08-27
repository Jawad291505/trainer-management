import {
    CheckOutlined,
    CoffeeOutlined,
    ThunderboltOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons'
import { activityColors } from '../../../services/mockData'

const TYPE_ICON = {
    meal: CoffeeOutlined,
    workout: ThunderboltOutlined,
    walk: ClockCircleOutlined,
    water: ClockCircleOutlined,
    sleep: ClockCircleOutlined,
}

// A single, tap-to-complete task row. Big touch target for mobile.
export default function TaskItem({ task, onToggle }) {
    const Icon = TYPE_ICON[task.type] || ClockCircleOutlined
    const color = activityColors[task.type] || 'var(--color-primary)'

    return (
        <button
            onClick={() => onToggle(task.id)}
            className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all"
            style={{
                background: task.done ? 'var(--color-success-soft)' : 'var(--color-surface-secondary)',
                border: `1px solid ${task.done ? 'transparent' : 'var(--color-border)'}`,
            }}
        >
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: task.done ? 'var(--color-success)' : 'var(--color-surface)', color: task.done ? '#fff' : color }}
            >
                {task.done ? <CheckOutlined /> : <Icon />}
            </span>
            <div className="min-w-0 flex-1">
                <div className={`text-sm font-semibold ${task.done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                    {task.label}
                </div>
                {task.time && <div className="text-xs text-text-muted">{task.time}</div>}
            </div>
            <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                style={{
                    borderColor: task.done ? 'var(--color-success)' : 'var(--color-border-strong)',
                    background: task.done ? 'var(--color-success)' : 'transparent',
                    color: '#fff',
                }}
            >
                {task.done && <CheckOutlined style={{ fontSize: 12 }} />}
            </span>
        </button>
    )
}
