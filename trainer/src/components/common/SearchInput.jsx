import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'

export default function SearchInput({ value, onChange, placeholder = 'Search…', className, style }) {
    return (
        <Input
            allowClear
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            prefix={<SearchOutlined style={{ color: 'var(--color-text-muted)' }} />}
            className={className}
            style={{ maxWidth: 280, ...style }}
        />
    )
}
