import {
    CheckCircleFilled,
    ClockCircleOutlined,
    CalendarOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import { schedule, activityColors } from '../../../services/mockData'

export default function MySchedule() {
    return (
        <div>
            <PageHeader title="My Schedule" subtitle="Your activities for today and what's coming up." />

            {/* Today timeline */}
            <div className="app-card mb-6 p-5">
                <h3 className="section-title mb-4">Today</h3>
                <div className="flex flex-col">
                    {schedule.today.map((a, i) => {
                        const last = i === schedule.today.length - 1
                        const color = activityColors[a.type]
                        return (
                            <div key={a.id} className="flex gap-4">
                                <div className="flex w-12 shrink-0 justify-end pt-0.5 text-xs font-bold text-text-primary">{a.time}</div>
                                <div className="relative flex flex-col items-center">
                                    <span className="z-10 h-3.5 w-3.5 rounded-full" style={{ background: color, boxShadow: '0 0 0 2px var(--color-surface)' }} />
                                    {!last && <span className="w-0.5 flex-1" style={{ background: 'var(--color-border)' }} />}
                                </div>
                                <div className={`flex-1 rounded-xl p-3 ${last ? '' : 'mb-4'}`} style={{ background: 'var(--color-surface-secondary)' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold text-text-primary">{a.title}</span>
                                        {a.done ? (
                                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                                                <CheckCircleFilled /> Done
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs text-text-muted">
                                                <ClockCircleOutlined /> Upcoming
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Upcoming */}
            <div className="app-card p-5">
                <h3 className="section-title mb-4">Upcoming</h3>
                <div className="flex flex-col gap-3">
                    {schedule.upcoming.map((u) => (
                        <div key={u.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'var(--color-surface)', color: activityColors[u.type] }}>
                                <CalendarOutlined />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-text-primary">{u.title}</div>
                                <div className="text-xs text-text-muted">{u.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
