import { useState } from 'react'
import { Select } from 'antd'

// A Select that also lets the user type a brand-new value ("add your own").
// Works as a controlled input and inside an AntD <Form.Item> (value / onChange).
// `options` accepts an array of strings or { value, label } objects.
export default function TagSelect({
    value,
    onChange,
    options = [],
    placeholder = 'Select or type to add…',
    style,
    disabled,
    allowClear = false,
}) {
    const [search, setSearch] = useState('')

    const base = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
    const known = new Set(base.map((o) => o.value))
    const list = [...base]

    // Keep a current custom value visible as an option.
    if (value && !known.has(value)) list.push({ value, label: value })

    // Offer to add whatever the user is typing.
    const q = search.trim()
    if (q && !known.has(q) && q !== value) list.push({ value: q, label: `Add “${q}”` })

    return (
        <Select
            showSearch
            allowClear={allowClear}
            value={value || undefined}
            placeholder={placeholder}
            style={style}
            disabled={disabled}
            options={list}
            searchValue={search}
            onSearch={setSearch}
            onChange={(v) => {
                onChange?.(v)
                setSearch('')
            }}
            onBlur={() => setSearch('')}
            filterOption={(input, opt) =>
                String(opt?.value ?? '').toLowerCase().includes(input.toLowerCase())
            }
        />
    )
}
