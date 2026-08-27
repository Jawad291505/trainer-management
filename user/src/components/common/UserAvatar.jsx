import { Avatar } from 'antd'

// Deterministic initials avatar with a color derived from the record.
export default function UserAvatar({ name = '', color, size = 40, src }) {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

    return (
        <Avatar
            src={src}
            size={size}
            style={{
                background: color || 'var(--color-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: size * 0.36,
                flexShrink: 0,
            }}
        >
            {initials}
        </Avatar>
    )
}
