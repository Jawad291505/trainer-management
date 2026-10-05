import { useState } from 'react'
import { Select, Input, Button, Divider } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

// Category picker that can also create a category: pick an existing one, or type
// a new name in the dropdown footer and add it. Works as a Form.Item child
// (`value` / `onChange`). `onCreate(name)` returns the name to select — the
// existing spelling when that category is already in the list.
export default function CategorySelect({ value, onChange, categories, onCreate, ...rest }) {
    const [draft, setDraft] = useState('')

    const add = () => {
        const name = onCreate(draft)
        if (!name) return
        onChange?.(name)
        setDraft('')
    }

    return (
        <Select
            showSearch
            value={value}
            onChange={onChange}
            options={categories.map((c) => ({ value: c, label: c }))}
            optionFilterProp="label"
            placeholder="Select a category"
            dropdownRender={(menu) => (
                <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <div className="flex gap-2 px-2 pb-1">
                        <Input
                            value={draft}
                            placeholder="New category"
                            maxLength={60}
                            onChange={(e) => setDraft(e.target.value)}
                            // Keep typing/Enter inside the input instead of driving the Select.
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Enter') { e.preventDefault(); add() }
                            }}
                        />
                        <Button type="text" icon={<PlusOutlined />} disabled={!draft.trim()} onClick={add}>
                            Add
                        </Button>
                    </div>
                </>
            )}
            {...rest}
        />
    )
}
