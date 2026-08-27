import { useMemo, useState } from 'react'
import { Select, Button, Modal, App, Empty } from 'antd'
import {
    PlusOutlined,
    ArrowRightOutlined,
    UserSwitchOutlined,
    CloseOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import UserAvatar from '../../../components/common/UserAvatar'
import StatusBadge from '../../../components/common/StatusBadge'
import CapacityBar from '../../../components/common/CapacityBar'
import { confirmDelete } from '../../../utils/confirm'
import { trainers as trainerSeed, clients as clientSeed } from '../../../services/mockData'

export default function Assignments() {
    const { message } = App.useApp()
    const [trainers, setTrainers] = useState(trainerSeed)
    const [clients, setClients] = useState(clientSeed)
    const [selectedId, setSelectedId] = useState(trainerSeed[0].id)
    const [assignOpen, setAssignOpen] = useState(false)
    const [toAssign, setToAssign] = useState(null)

    const selected = trainers.find((t) => t.id === selectedId)
    const assignedClients = useMemo(
        () => clients.filter((c) => c.trainerId === selectedId),
        [clients, selectedId],
    )
    const unassignable = useMemo(
        () => clients.filter((c) => c.trainerId !== selectedId),
        [clients, selectedId],
    )

    const syncCount = (trainerId, delta) =>
        setTrainers((prev) => prev.map((t) => (t.id === trainerId ? { ...t, clients: t.clients + delta } : t)))

    const removeClient = (client) =>
        confirmDelete({
            title: 'Remove client?',
            content: `Unassign ${client.name} from ${selected.name}?`,
            okText: 'Remove',
            onOk: () => {
                setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, trainerId: null, trainerName: 'Unassigned' } : c)))
                syncCount(selectedId, -1)
                message.success('Client removed')
            },
        })

    const confirmAssign = () => {
        if (!toAssign) return
        if (selected.clients >= selected.capacity) {
            message.error('Trainer is at full capacity')
            return
        }
        const client = clients.find((c) => c.id === toAssign)
        const prevTrainer = client.trainerId
        setClients((prev) =>
            prev.map((c) => (c.id === toAssign ? { ...c, trainerId: selectedId, trainerName: selected.name } : c)),
        )
        if (prevTrainer) syncCount(prevTrainer, -1)
        syncCount(selectedId, 1)
        message.success(`${client.name} assigned to ${selected.name}`)
        setAssignOpen(false)
        setToAssign(null)
    }

    const atCapacity = selected.clients >= selected.capacity

    return (
        <div>
            <PageHeader
                title="Trainer / Client Assignments"
                subtitle="Manage which clients belong to each trainer."
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Trainer selector list */}
                <div className="app-card p-3 lg:col-span-1">
                    <div className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                        Trainers
                    </div>
                    <div className="flex flex-col gap-1">
                        {trainers.map((t) => {
                            const active = t.id === selectedId
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setSelectedId(t.id)}
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                                    style={{ background: active ? 'var(--color-primary-soft)' : 'transparent' }}
                                >
                                    <UserAvatar name={t.name} color={t.avatarColor} size={38} />
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-semibold text-text-primary">{t.name}</div>
                                        <div className="text-xs text-text-muted">
                                            {t.clients}/{t.capacity} clients
                                        </div>
                                    </div>
                                    {active && <ArrowRightOutlined style={{ color: 'var(--color-primary)' }} />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Selected trainer detail + assigned clients */}
                <div className="lg:col-span-2">
                    <div className="app-card mb-4 p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <UserAvatar name={selected.name} color={selected.avatarColor} size={52} />
                                <div>
                                    <div className="text-lg font-bold text-text-primary">{selected.name}</div>
                                    <div className="text-xs text-text-muted">{selected.specialization}</div>
                                </div>
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                disabled={atCapacity}
                                onClick={() => setAssignOpen(true)}
                            >
                                Assign client
                            </Button>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {[
                                { label: 'Current', value: selected.clients },
                                { label: 'Capacity', value: selected.capacity },
                                { label: 'Available', value: Math.max(0, selected.capacity - selected.clients) },
                                { label: 'Usage', value: `${Math.round((selected.clients / selected.capacity) * 100)}%` },
                            ].map((s) => (
                                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--color-surface-secondary)' }}>
                                    <div className="text-lg font-extrabold text-text-primary">{s.value}</div>
                                    <div className="text-[11px] text-text-muted">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4">
                            <CapacityBar current={selected.clients} max={selected.capacity} />
                        </div>

                        {atCapacity && (
                            <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>
                                <ThunderboltOutlined />
                                <span className="font-medium">At full capacity.</span>
                                <button
                                    className="ml-auto font-semibold underline"
                                    onClick={() => {
                                        setTrainers((prev) => prev.map((t) => (t.id === selectedId ? { ...t, capacity: t.capacity + 5 } : t)))
                                        message.success('Capacity increased by 5')
                                    }}
                                >
                                    Increase capacity
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="app-card p-3">
                        <div className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                            Assigned clients ({assignedClients.length})
                        </div>
                        {assignedClients.length === 0 ? (
                            <div className="py-8">
                                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No clients assigned yet" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {assignedClients.map((c) => (
                                    <div key={c.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--color-surface-secondary)' }}>
                                        <UserAvatar name={c.name} color={c.avatarColor} size={36} />
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-text-primary">{c.name}</div>
                                            <div className="text-xs text-text-muted">{c.goal}</div>
                                        </div>
                                        <StatusBadge status={c.status} />
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<CloseOutlined />}
                                            onClick={() => removeClient(c)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                title={`Assign client to ${selected.name}`}
                open={assignOpen}
                onCancel={() => setAssignOpen(false)}
                onOk={confirmAssign}
                okText="Assign"
                okButtonProps={{ icon: <UserSwitchOutlined /> }}
                centered
            >
                <p className="mb-2 text-sm text-text-secondary">
                    Select a client to assign. Reassigning moves them from their current trainer.
                </p>
                <Select
                    showSearch
                    placeholder="Search a client…"
                    style={{ width: '100%' }}
                    value={toAssign}
                    onChange={setToAssign}
                    optionFilterProp="label"
                    options={unassignable.map((c) => ({
                        value: c.id,
                        label: `${c.name} — ${c.trainerName || 'Unassigned'}`,
                    }))}
                />
            </Modal>
        </div>
    )
}
