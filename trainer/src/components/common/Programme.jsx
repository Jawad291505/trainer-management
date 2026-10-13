import { useEffect, useState } from 'react'
import { Modal, Form, Select, InputNumber, DatePicker, Button, Progress, App } from 'antd'
import { CalendarOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import ModalTitle from './ModalTitle'
import { api } from '../../services/api'
import { formatPkt, pktDateStr } from '../../utils/pkt'
import {
    PROGRAMME_PRESETS, PROGRAMME_MAX_DAYS, programmeStatus, programmeName, programmeDay, programmeHint, programmePercent,
} from '../../utils/programme'

// Everything the admin / trainer screens need for a client's programme (its
// length in days from a start date — see utils/programme.js):
//   ProgrammeFields  — the length + start-date inputs, for the add-client form
//   ProgrammeCell    — compact "Day 23/90" for tables and cards
//   ProgrammeCard    — the full summary, with a button to manage it
//   ProgrammeModal   — set, extend or renew a client's programme

const CUSTOM = 'custom'
const lengthOptions = [
    ...PROGRAMME_PRESETS.map((d) => ({ value: d, label: `${d} days` })),
    { value: CUSTOM, label: 'Custom…' },
]

// Form values <-> what the API takes ({ programDays, programStart: 'YYYY-MM-DD' }).
export const programmeFormDefaults = () => ({ programLength: 90, programStart: dayjs(pktDateStr()) })

export function programmeFormValues(client) {
    if (!client?.programDays) return programmeFormDefaults()
    const preset = PROGRAMME_PRESETS.includes(client.programDays)
    return {
        programLength: preset ? client.programDays : CUSTOM,
        programCustomDays: preset ? undefined : client.programDays,
        programStart: dayjs(pktDateStr(new Date(client.programStart))),
    }
}

const formDays = (v) => (v.programLength === CUSTOM ? v.programCustomDays : v.programLength)

export function programmePayload(v) {
    return { programDays: formDays(v), programStart: (v.programStart || dayjs(pktDateStr())).format('YYYY-MM-DD') }
}

export function ProgrammeFields({ form }) {
    const length = Form.useWatch('programLength', form)
    return (
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item name="programLength" label="Programme length" tooltip="How many days this client's programme runs" rules={[{ required: true, message: 'Pick a length' }]}>
                <Select options={lengthOptions} />
            </Form.Item>
            <Form.Item name="programStart" label="Start date" rules={[{ required: true, message: 'Pick a start date' }]}>
                <DatePicker allowClear={false} format="D MMM YYYY" style={{ width: '100%' }} />
            </Form.Item>
            {length === CUSTOM && (
                <Form.Item name="programCustomDays" label="Number of days" rules={[{ required: true, message: 'Enter the number of days' }]}>
                    <InputNumber min={1} max={PROGRAMME_MAX_DAYS} precision={0} addonAfter="days" style={{ width: '100%' }} placeholder="e.g. 45" />
                </Form.Item>
            )}
        </div>
    )
}

export function ProgrammeCell({ programme }) {
    if (!programme) return <span className="text-text-muted">Not set</span>
    const s = programmeStatus(programme)
    return (
        <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-text-primary">Day {programme.day}/{programme.days}</span>
                <span className="truncate font-medium" style={{ color: s.color }}>{programme.status === 'active' ? programmeHint(programme) : s.label}</span>
            </div>
            <Progress percent={programmePercent(programme)} showInfo={false} size="small" strokeColor={s.color} style={{ margin: 0 }} />
        </div>
    )
}

export function ProgrammeCard({ programme, onManage, className = '' }) {
    const s = programmeStatus(programme)
    return (
        <div className={`app-card p-5 ${className}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Programme</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-base font-bold text-text-primary">
                        {programmeName(programme)}
                        {programme && (
                            <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: s.soft, color: s.color }}>{s.label}</span>
                        )}
                    </div>
                </div>
                {onManage && (
                    <Button icon={programme ? <EditOutlined /> : <CalendarOutlined />} onClick={onManage}>
                        {!programme ? 'Set programme' : programme.status === 'ended' ? 'Renew' : 'Extend / edit'}
                    </Button>
                )}
            </div>
            {programme ? (
                <>
                    <div className="mt-4 flex items-center justify-between text-sm">
                        <span className="font-semibold text-text-primary">{programmeDay(programme)}</span>
                        <span className="font-medium" style={{ color: s.color }}>{programmeHint(programme)}</span>
                    </div>
                    <Progress percent={programmePercent(programme)} showInfo={false} strokeColor={s.color} />
                    <div className="mt-1 flex justify-between text-xs text-text-muted">
                        <span>Started {formatPkt(programme.startDate, 'D MMM YYYY')}</span>
                        <span>Ends {formatPkt(programme.endDate, 'D MMM YYYY')}</span>
                    </div>
                </>
            ) : (
                <p className="mb-0 mt-3 text-sm text-text-muted">
                    Set how many days this client's programme runs — they, their trainer and the admin all see the day count and end date.
                </p>
            )}
        </div>
    )
}

export function ProgrammeModal({ client, open, onClose, onSaved }) {
    const { message } = App.useApp()
    const [form] = Form.useForm()
    const [saving, setSaving] = useState(false)
    const length = Form.useWatch('programLength', form)
    const customDays = Form.useWatch('programCustomDays', form)
    const start = Form.useWatch('programStart', form)
    const days = length === CUSTOM ? customDays : length
    const programme = client?.programme || null

    useEffect(() => {
        if (open) form.setFieldsValue({ programCustomDays: undefined, ...programmeFormValues(client) })
    }, [open, client, form])

    const addDays = (n) => form.setFieldsValue({ programLength: CUSTOM, programCustomDays: Math.min(PROGRAMME_MAX_DAYS, (Number(days) || 0) + n) })
    const restartToday = () => form.setFieldsValue({ programStart: dayjs(pktDateStr()) })

    const save = async () => {
        const v = await form.validateFields()
        setSaving(true)
        try {
            const updated = await api.patch(`/clients/${client.id}`, programmePayload(v))
            onSaved?.(updated)
            message.success('Programme updated')
            onClose()
        } catch (err) {
            message.error(err.message || 'Failed to update programme')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            title={<ModalTitle icon={<CalendarOutlined />} title={programme ? 'Manage programme' : 'Set programme'} subtitle={client?.name} />}
            open={open}
            onCancel={() => { if (!saving) onClose() }}
            onOk={save}
            okText="Save programme"
            okButtonProps={{ icon: <SaveOutlined /> }}
            confirmLoading={saving}
            forceRender
            centered
        >
            <Form form={form} layout="vertical" className="mt-4">
                <ProgrammeFields form={form} />
            </Form>
            {programme && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-text-muted">Extend:</span>
                    {[7, 14, 30].map((n) => <Button key={n} size="small" onClick={() => addDays(n)}>+{n} days</Button>)}
                    <span className="ml-2 text-xs font-semibold text-text-muted">Renew:</span>
                    <Button size="small" onClick={restartToday}>Restart from today</Button>
                </div>
            )}
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--color-surface-secondary)' }}>
                <span className="font-semibold text-text-secondary">Ends</span>
                <span className="font-bold text-text-primary">
                    {days && start ? `${start.add(days - 1, 'day').format('D MMM YYYY')} · ${days} days` : 'Pick a length and start date'}
                </span>
            </div>
        </Modal>
    )
}
