// Follow-up choices shared by the Follow-ups page, the client profile tab and the
// schedule/complete modals. Values match backend config/constants.js.
export const FOLLOWUP_TYPE_OPTIONS = [
    { value: 'check-in', label: 'Check-in' },
    { value: 'call', label: 'Call' },
    { value: 'in-person', label: 'In-person' },
    { value: 'plan-review', label: 'Plan review' },
]

export const FOLLOWUP_TYPE_LABELS = Object.fromEntries(FOLLOWUP_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export const FOLLOWUP_BUCKETS = [
    { key: 'today', label: 'Due Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'completed', label: 'Completed' },
    { key: 'missed', label: 'Missed' },
]

// Default gap when a trainer books the next follow-up straight after completing one.
export const NEXT_FOLLOWUP_DAYS = 7
