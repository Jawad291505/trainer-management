import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Select, Button, App } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import EmptyState from '../../../components/common/EmptyState'
import TrainerCard from '../components/TrainerCard'
import { confirmDelete } from '../../../utils/confirm'
import { trainers as seed } from '../../../services/mockData'

export default function Trainers() {
    const { message } = App.useApp()
    const navigate = useNavigate()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((t) => {
            const matchQ = !q || t.name.toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q)
            const matchS = status === 'all' || t.status === status
            return matchQ && matchS
        })
    }, [data, search, status])

    const update = (id, patch) => setData((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

    const handleAction = (key, trainer) => {
        switch (key) {
            case 'view':
                navigate(`/trainers/${trainer.id}`)
                break
            case 'increase':
                update(trainer.id, { capacity: trainer.capacity + 1 })
                message.success(`Capacity increased to ${trainer.capacity + 1}`)
                break
            case 'decrease':
                if (trainer.capacity <= trainer.clients) {
                    message.warning('Capacity cannot be below current client count')
                } else {
                    update(trainer.id, { capacity: trainer.capacity - 1 })
                    message.success(`Capacity decreased to ${trainer.capacity - 1}`)
                }
                break
            case 'toggle':
                update(trainer.id, { status: trainer.status === 'active' ? 'inactive' : 'active' })
                message.success(`${trainer.name} ${trainer.status === 'active' ? 'deactivated' : 'activated'}`)
                break
            case 'delete':
                confirmDelete({
                    title: 'Delete trainer?',
                    content: `This will remove ${trainer.name} and unassign their clients.`,
                    okText: 'Delete trainer',
                    onOk: () => {
                        setData((prev) => prev.filter((t) => t.id !== trainer.id))
                        message.success('Trainer deleted')
                    },
                })
                break
            default:
                message.info(`${key} — ${trainer.name}`)
        }
    }

    return (
        <div>
            <PageHeader title="Trainer Management" subtitle={`${filtered.length} trainers on the platform`}>
                <Button type="primary" icon={<PlusOutlined />}>
                    Create trainer
                </Button>
            </PageHeader>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search trainers…" />
                <Select
                    value={status}
                    onChange={setStatus}
                    style={{ width: 150 }}
                    options={[
                        { value: 'all', label: 'All status' },
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' },
                    ]}
                />
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No trainers found" description="Try adjusting your search or filters." />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((t) => (
                        <TrainerCard key={t.id} trainer={t} onAction={handleAction} />
                    ))}
                </div>
            )}
        </div>
    )
}
