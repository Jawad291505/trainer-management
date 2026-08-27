import { CheckCircleFilled, SyncOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { activityTypes, getClient } from '../../../services/mockData'

const STATUS = {
    completed: { icon: <CheckCircleFilled />, color: 'var(--color-success)', label: 'Completed' },
    'in-progress': { icon: <SyncOutlined spin />, color: 'var(--color-info)', label: 'In progress' },
    upcoming: { icon: <ClockCircleOutlined />, color: 'var(--color-text-muted)', label: 'Upcoming' },
    cancelled: { icon: <ClockCircleOutlined />, color: 'var(--color-danger)', label: 'Cancelled' },
}

// Vertical timeline for the trainer's daily schedule.
export default function ScheduleTimeline({ items }) {
    return (
        <div className="flex flex-col">
            {items.map((s, i) => {
                const type = activityTypes[s.type]
                const st = STATUS[s.status] || STATUS.upcoming
                const client = s.clientId ? getClient(s.clientId) : null
                const last = i === items.length - 1
                return (
                    <div key={s.id} className="flex gap-4">
                        {/* Time + rail */}
                        <div className="flex w-14 shrink-0 flex-col items-end pt-0.5">
                            <span className="text-xs font-bold text-text-primary">{s.time}</span>
                        </div>
                        <div className="relative flex flex-col items-center">
                            <span
                                className="z-10 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4"
                                style={{ background: type.color, boxShadow: '0 0 0 2px var(--color-surface)' }}
                            />
                            {!last && <span className="w-0.5 flex-1" style={{ background: 'var(--color-border)' }} />}
                        </div>
                        {/* Card */}
                        <div className={`mb-4 flex-1 rounded-xl p-3 ${last ? 'mb-0' : ''}`} style={{ background: 'var(--color-surface-secondary)' }}>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-text-primary">{s.title}</span>
                                <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                                    style={{ color: st.color }}
                                >
                                    {st.icon} {st.label}
                                </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                                <span
                                    className="rounded px-1.5 py-0.5 font-medium"
                                    style={{ background: 'var(--color-surface)', color: type.color }}
                                >
                                    {type.label}
                                </span>
                                {client && <span>· {client.name}</span>}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
