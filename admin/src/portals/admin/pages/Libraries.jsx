import { useMemo, useState } from 'react'
import { Select, Segmented, Button, Modal, Form, Input, InputNumber, App, Dropdown } from 'antd'
import {
    PlusOutlined,
    LinkOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    ReadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    PlayCircleOutlined,
    FileTextOutlined,
    AppleOutlined,
    BulbOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons'
import PageHeader from '../../../components/common/PageHeader'
import FilterBar from '../../../components/common/FilterBar'
import SearchInput from '../../../components/common/SearchInput'
import DataTable from '../../../components/tables/DataTable'
import StatusBadge from '../../../components/common/StatusBadge'
import EmptyState from '../../../components/common/EmptyState'
import TagSelect from '../../../components/common/TagSelect'
import { formatQty } from '../../../utils/foodScale'
import { confirmDelete } from '../../../utils/confirm'
import { libraryResources as seed, libraryCategories } from '../../../services/mockData'
import {
    foodLibrary,
    foodCategories,
    exerciseLibrary,
    exerciseCategories,
    slugify,
} from '../../../services/masterData'

const CAT_ICON = {
    'Workout Guides': ReadOutlined,
    'Nutrition Guides': AppleOutlined,
    'Exercise Videos': PlayCircleOutlined,
    Documents: FileTextOutlined,
    'Educational Resources': BulbOutlined,
}

// Master-data seeds, flattened to an editable row list (admin owns this data).
// Each row keeps both the display `category` and a stable `categorySlug` — the
// slug is the reference key once this data lives in a database.
const foodSeed = foodLibrary.flatMap((g, gi) =>
    g.foods.map((f, fi) => ({ id: `FD-${gi}-${fi}`, category: g.category, categorySlug: g.slug || slugify(g.category), ...f })),
)
const exerciseSeed = exerciseLibrary.flatMap((g, gi) =>
    g.exercises.map((e, ei) => ({ id: `EX-${gi}-${ei}`, category: g.category, categorySlug: g.slug || slugify(g.category), ...e })),
)

// Resolve a typed/selected category to a canonical { name, slug }. If the slug
// already exists in `registry`, snap to that entry's name so we don't create a
// near-duplicate that differs only by case or spacing.
function resolveCategory(input, registry) {
    const slug = slugify(input)
    const existing = registry.find((c) => c.slug === slug)
    return existing || { name: String(input).trim(), slug }
}

export default function Libraries() {
    const [tab, setTab] = useState('Resources')

    return (
        <div>
            <PageHeader
                title="Library Management"
                subtitle="Master data for the platform. Trainers select from this library when building client plans."
            />

            <div className="mb-4">
                <Segmented
                    value={tab}
                    onChange={setTab}
                    options={['Resources', 'Food Library', 'Exercise Library']}
                />
            </div>

            {tab === 'Resources' && <ResourcesLibrary />}
            {tab === 'Food Library' && <FoodLibrary />}
            {tab === 'Exercise Library' && <ExerciseLibrary />}
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Resources (external links / Google Drive)                          */
/* ------------------------------------------------------------------ */
function ResourcesLibrary() {
    const { message } = App.useApp()
    const [data, setData] = useState(seed)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [view, setView] = useState('grid')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((r) => {
            const matchQ = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
            const matchC = category === 'all' || r.category === category
            return matchQ && matchC
        })
    }, [data, search, category])

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        setModalOpen(true)
    }
    const openEdit = (r) => {
        setEditing(r)
        form.setFieldsValue(r)
        setModalOpen(true)
    }

    const save = async () => {
        const values = await form.validateFields()
        if (editing) {
            setData((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...values } : r)))
            message.success('Resource updated')
        } else {
            setData((prev) => [
                { id: `LB-${Date.now()}`, status: 'active', updated: new Date().toISOString().slice(0, 10), ...values },
                ...prev,
            ])
            message.success('Resource added')
        }
        setModalOpen(false)
    }

    const remove = (r) =>
        confirmDelete({
            title: 'Delete resource?',
            content: `Remove "${r.title}" from the library?`,
            onOk: () => {
                setData((prev) => prev.filter((x) => x.id !== r.id))
                message.success('Resource deleted')
            },
        })

    const cardMenu = (r) => ({
        items: [
            { key: 'open', icon: <LinkOutlined />, label: 'Open link' },
            { key: 'edit', icon: <EditOutlined />, label: 'Edit' },
            { key: 'toggle', label: r.status === 'active' ? 'Deactivate' : 'Activate' },
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: 'Delete', danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'open') window.open(r.url, '_blank', 'noopener,noreferrer')
            else if (key === 'edit') openEdit(r)
            else if (key === 'delete') remove(r)
            else if (key === 'toggle') {
                setData((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x)))
                message.success('Status updated')
            }
        },
    })

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'title',
            render: (_, r) => {
                const Icon = CAT_ICON[r.category] || ReadOutlined
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                            <Icon />
                        </div>
                        <div className="min-w-0">
                            <div className="truncate font-semibold text-text-primary">{r.title}</div>
                            <div className="truncate text-xs text-text-muted">{r.description}</div>
                        </div>
                    </div>
                )
            },
        },
        { title: 'Category', dataIndex: 'category', width: 180, render: (c) => <span className="text-text-secondary">{c}</span> },
        { title: 'Status', dataIndex: 'status', width: 120, render: (s) => <StatusBadge status={s} /> },
        { title: 'Updated', dataIndex: 'updated', width: 120, render: (d) => <span className="text-text-muted">{d}</span> },
        {
            title: '',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, r) => (
                <Dropdown trigger={['click']} menu={cardMenu(r)}>
                    <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
            ),
        },
    ]

    return (
        <div>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search resources…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 210 }}
                    options={[{ value: 'all', label: 'All categories' }, ...libraryCategories.map((c) => ({ value: c, label: c }))]}
                />
                <div className="sm:ml-auto flex items-center gap-2">
                    <Segmented
                        value={view}
                        onChange={setView}
                        options={[
                            { value: 'grid', icon: <AppstoreOutlined /> },
                            { value: 'table', icon: <UnorderedListOutlined /> },
                        ]}
                    />
                    <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                        Add resource
                    </Button>
                </div>
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState
                        title="No resources found"
                        description="Add your first Google Drive link or external resource."
                        action={<Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add resource</Button>}
                    />
                </div>
            ) : view === 'table' ? (
                <DataTable columns={columns} dataSource={filtered} pageSize={8} scrollX={800} />
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((r) => {
                        const Icon = CAT_ICON[r.category] || ReadOutlined
                        return (
                            <div key={r.id} className="app-card app-card-hover animate-rise flex flex-col p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                                        <Icon />
                                    </div>
                                    <Dropdown trigger={['click']} menu={cardMenu(r)}>
                                        <Button type="text" icon={<MoreOutlined />} />
                                    </Dropdown>
                                </div>
                                <div className="mt-3 flex-1">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">{r.category}</div>
                                    <div className="mt-1 font-bold text-text-primary">{r.title}</div>
                                    <p className="mt-1 mb-0 line-clamp-2 text-sm text-text-secondary">{r.description}</p>
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
                                    <StatusBadge status={r.status} />
                                    <a
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-sm font-semibold text-primary"
                                    >
                                        <LinkOutlined /> Open
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <Modal
                title={editing ? 'Edit resource' : 'Add resource'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add resource'}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Title is required' }]}>
                        <Input placeholder="e.g. Full Body Strength Program" />
                    </Form.Item>
                    <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Select a category' }]}>
                        <Select options={libraryCategories.map((c) => ({ value: c, label: c }))} placeholder="Select category" />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <Input.TextArea rows={2} placeholder="Short description of the resource" />
                    </Form.Item>
                    <Form.Item
                        name="url"
                        label="External URL"
                        rules={[
                            { required: true, message: 'URL is required' },
                            { type: 'url', message: 'Enter a valid URL' },
                        ]}
                    >
                        <Input placeholder="https://drive.google.com/…" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Food Library (master food data)                                    */
/* ------------------------------------------------------------------ */
function FoodLibrary() {
    const { message } = App.useApp()
    const [data, setData] = useState(foodSeed)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    // Category registry = the master list plus any the admin has added, deduped by slug.
    const registry = useMemo(() => {
        const seen = new Map()
        for (const name of [...foodCategories, ...data.map((d) => d.category)]) {
            const slug = slugify(name)
            if (!seen.has(slug)) seen.set(slug, { name, slug })
        }
        return [...seen.values()]
    }, [data])
    const categories = registry.map((c) => c.name)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((r) => {
            const matchQ = !q || r.food.toLowerCase().includes(q)
            const matchC = category === 'all' || r.category === category
            return matchQ && matchC
        })
    }, [data, search, category])

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue({ amount: 1, cal: 0, protein: 0, carbs: 0, fat: 0 })
        setModalOpen(true)
    }
    const openEdit = (r) => {
        setEditing(r)
        form.setFieldsValue(r)
        setModalOpen(true)
    }

    const save = async () => {
        const v = await form.validateFields()
        const cat = resolveCategory(v.category, registry)
        const record = { ...v, category: cat.name, categorySlug: cat.slug }
        if (editing) {
            setData((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...record } : r)))
            message.success('Food updated')
        } else {
            setData((prev) => [{ id: `FD-${Date.now()}`, ...record }, ...prev])
            message.success('Food added')
        }
        setModalOpen(false)
    }

    const remove = (r) =>
        confirmDelete({
            title: 'Delete food?',
            content: `Remove "${r.food}" from the food library?`,
            onOk: () => {
                setData((prev) => prev.filter((x) => x.id !== r.id))
                message.success('Food deleted')
            },
        })

    const columns = [
        {
            title: 'Food',
            dataIndex: 'food',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        <AppleOutlined />
                    </div>
                    <div className="font-semibold text-text-primary">{r.food}</div>
                </div>
            ),
        },
        { title: 'Category', dataIndex: 'category', width: 150, render: (c) => <span className="text-text-secondary">{c}</span> },
        { title: 'Serving', key: 'serving', width: 130, render: (_, r) => <span className="text-text-secondary">{formatQty(r)}</span> },
        { title: 'Calories', dataIndex: 'cal', width: 100, render: (c) => <span className="text-text-secondary">{c}</span> },
        {
            title: 'P / C / F',
            key: 'macros',
            width: 120,
            render: (_, r) => <span className="text-text-muted">{r.protein} / {r.carbs} / {r.fat}</span>,
        },
        {
            title: '',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_, r) => (
                <div className="flex items-center gap-1">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
                </div>
            ),
        },
    ]

    return (
        <div>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search foods…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 200 }}
                    options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
                />
                <Button className="sm:ml-auto" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add food
                </Button>
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No foods found" description="Add a food item to the master library." />
                </div>
            ) : (
                <DataTable columns={columns} dataSource={filtered} pageSize={10} scrollX={760} />
            )}

            <Modal
                title={editing ? 'Edit food' : 'Add food'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add food'}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="food" label="Food" rules={[{ required: true, message: 'Enter a food name' }]}>
                        <Input placeholder="e.g. Grilled chicken breast" />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Select or add a category' }]}>
                            <TagSelect options={categories} placeholder="Select or type a new category" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-x-3">
                            <Form.Item name="amount" label="Serving amount" rules={[{ required: true, message: 'Enter an amount' }]}>
                                <InputNumber min={0} step={0.25} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name="unit" label="Unit" rules={[{ required: true, message: 'Enter a unit' }]}>
                                <Input placeholder="e.g. g, cup" />
                            </Form.Item>
                        </div>
                        <Form.Item name="cal" label="Calories"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="protein" label="Protein (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="carbs" label="Carbs (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                        <Form.Item name="fat" label="Fats (g)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Exercise Library (master exercise data)                            */
/* ------------------------------------------------------------------ */
function ExerciseLibrary() {
    const { message } = App.useApp()
    const [data, setData] = useState(exerciseSeed)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('all')
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form] = Form.useForm()

    // Category registry = the master muscle groups plus any the admin has added, deduped by slug.
    const registry = useMemo(() => {
        const seen = new Map()
        for (const name of [...exerciseCategories, ...data.map((d) => d.category)]) {
            const slug = slugify(name)
            if (!seen.has(slug)) seen.set(slug, { name, slug })
        }
        return [...seen.values()]
    }, [data])
    const categories = registry.map((c) => c.name)

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return data.filter((r) => {
            const matchQ = !q || r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q)
            const matchC = category === 'all' || r.category === category
            return matchQ && matchC
        })
    }, [data, search, category])

    const openAdd = () => {
        setEditing(null)
        form.resetFields()
        form.setFieldsValue({ sets: 3, reps: '10-12', rest: '60s' })
        setModalOpen(true)
    }
    const openEdit = (r) => {
        setEditing(r)
        form.setFieldsValue(r)
        setModalOpen(true)
    }

    const save = async () => {
        const v = await form.validateFields()
        const cat = resolveCategory(v.category, registry)
        const record = { ...v, category: cat.name, categorySlug: cat.slug }
        if (editing) {
            setData((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...record } : r)))
            message.success('Exercise updated')
        } else {
            setData((prev) => [{ id: `EX-${Date.now()}`, ...record }, ...prev])
            message.success('Exercise added')
        }
        setModalOpen(false)
    }

    const remove = (r) =>
        confirmDelete({
            title: 'Delete exercise?',
            content: `Remove "${r.name}" from the exercise library?`,
            onOk: () => {
                setData((prev) => prev.filter((x) => x.id !== r.id))
                message.success('Exercise deleted')
            },
        })

    const columns = [
        {
            title: 'Exercise',
            dataIndex: 'name',
            render: (_, r) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)' }}>
                        <ThunderboltOutlined />
                    </div>
                    <div className="min-w-0">
                        <div className="truncate font-semibold text-text-primary">{r.name}</div>
                        <div className="truncate text-xs text-text-muted">{r.description}</div>
                    </div>
                </div>
            ),
        },
        { title: 'Category', dataIndex: 'category', width: 160, render: (c) => <span className="text-text-secondary">{c}</span> },
        { title: 'Equipment', dataIndex: 'equipment', width: 150, render: (e) => <span className="text-text-muted">{e || '—'}</span> },
        {
            title: 'Default',
            key: 'default',
            width: 150,
            render: (_, r) => <span className="text-text-secondary">{r.sets} × {r.reps}</span>,
        },
        {
            title: 'Video',
            dataIndex: 'video',
            width: 90,
            render: (v) =>
                v ? (
                    <a href={v} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-danger)' }}>
                        <PlayCircleOutlined /> Link
                    </a>
                ) : (
                    <span className="text-text-muted">—</span>
                ),
        },
        {
            title: '',
            key: 'actions',
            width: 90,
            fixed: 'right',
            render: (_, r) => (
                <div className="flex items-center gap-1">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
                </div>
            ),
        },
    ]

    return (
        <div>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search exercises…" />
                <Select
                    value={category}
                    onChange={setCategory}
                    style={{ width: 210 }}
                    options={[{ value: 'all', label: 'All muscle groups' }, ...categories.map((c) => ({ value: c, label: c }))]}
                />
                <Button className="sm:ml-auto" type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                    Add exercise
                </Button>
            </FilterBar>

            {filtered.length === 0 ? (
                <div className="app-card">
                    <EmptyState title="No exercises found" description="Add an exercise to the master library." />
                </div>
            ) : (
                <DataTable columns={columns} dataSource={filtered} pageSize={10} scrollX={1000} />
            )}

            <Modal
                title={editing ? 'Edit exercise' : 'Add exercise'}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                okText={editing ? 'Save changes' : 'Add exercise'}
                centered
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item name="name" label="Exercise name" rules={[{ required: true, message: 'Enter an exercise name' }]}>
                        <Input placeholder="e.g. Barbell Bench Press" />
                    </Form.Item>
                    <div className="grid grid-cols-2 gap-x-4">
                        <Form.Item name="category" label="Category / muscle group" rules={[{ required: true, message: 'Select or add a category' }]}>
                            <TagSelect options={categories} placeholder="Select or type a new category" />
                        </Form.Item>
                        <Form.Item name="equipment" label="Equipment">
                            <Input placeholder="e.g. Barbell + bench" />
                        </Form.Item>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4">
                        <Form.Item name="sets" label="Default sets" rules={[{ required: true, message: 'Required' }]}>
                            <InputNumber min={1} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="reps" label="Default reps" rules={[{ required: true, message: 'Required' }]}>
                            <Input placeholder="8-12" />
                        </Form.Item>
                        <Form.Item name="rest" label="Rest">
                            <Input placeholder="60s" />
                        </Form.Item>
                    </div>
                    <Form.Item name="description" label="Description / instructions">
                        <Input.TextArea rows={3} placeholder="How to perform the exercise with proper form…" />
                    </Form.Item>
                    <Form.Item
                        name="video"
                        label="Reference video (YouTube)"
                        rules={[{ type: 'url', message: 'Enter a valid URL' }]}
                    >
                        <Input placeholder="https://www.youtube.com/watch?v=…" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}
