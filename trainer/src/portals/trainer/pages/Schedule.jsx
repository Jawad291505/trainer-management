import { useState } from 'react'
import { Segmented, Button, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import ScheduleTimeline from '../components/ScheduleTimeline'
import { todaySchedule, activityTypes, getClient } from '../../../services/mockData'

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A simple week grid derived from the mock day schedule for demo purposes.
const weekEvents = {
    Mon: [
        { time: '08:00', title: 'Strength', type: 'workout' },
        { time: '14:00', title: 'Diet review', type: 'meal' },
    ],
    Tue: [{ time: '10:00', title: 'Consultation', type: 'consultation' }],
    Wed: [
        { time: '09:00', title: 'Hypertrophy', type: 'workout' },
        { time: '17:00', title: 'Follow-up', type: 'followup' },
    ],
    Thu: [{ time: '11:00', title: 'Endurance', type: 'workout' }],
    Fri: [
        { time: '08:30', title: 'Legs', type: 'workout' },
        { time: '15:00', title: 'Check-in', type: 'consultation' },
    ],
    Sat: [{ time: '10:00', title: 'Mobility', type: 'workout' }],
    Sun: [],
}

export default function Schedule() {
    const { message } = App.useApp()
    const [view, setView] = useState('day')

    return (
        <div>
            <PageHeader title="Schedule" subtitle="Plan and track your sessions.">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('Open new activity form')}>
                    New activity
                </Button>
            </PageHeader>

            <div className="mb-4 flex items-center justify-between">
                <Segmented
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'day', label: 'Day' },
                        { value: 'week', label: 'Week' },
                    ]}
                />
                {/* Legend */}
                <div className="hidden flex-wrap items-center gap-3 sm:flex">
                    {Object.entries(activityTypes).map(([key, t]) => (
                        <span key={key} className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                            {t.label}
                        </span>
                    ))}
                </div>
            </div>

            {view === 'day' ? (
                <div className="app-card p-5 md:p-6">
                    <div className="mb-4 text-sm font-bold text-text-primary">Thursday, 27 August 2026</div>
                    <ScheduleTimeline items={todaySchedule} />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
                    {WEEK.map((d) => (
                        <div key={d} className="app-card flex flex-col p-3">
                            <div className="mb-2 border-b pb-2 text-center text-sm font-bold text-text-primary" style={{ borderColor: 'var(--color-border)' }}>
                                {d}
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                                {weekEvents[d].length === 0 ? (
                                    <div className="py-4 text-center text-xs text-text-muted">Rest day</div>
                                ) : (
                                    weekEvents[d].map((e, i) => (
                                        <div
                                            key={i}
                                            className="rounded-lg p-2 text-xs"
                                            style={{ background: 'var(--color-surface-secondary)', borderLeft: `3px solid ${activityTypes[e.type].color}` }}
                                        >
                                            <div className="font-bold text-text-primary">{e.time}</div>
                                            <div className="text-text-secondary">{e.title}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
