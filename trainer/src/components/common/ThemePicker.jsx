import { ColorPicker, Button } from 'antd'
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { useTheme } from '../../context/ThemeContext'
import { THEME_PRESETS } from '../../constants/theme'

// Global accent-color picker. Presets + custom color, persisted via context.
export default function ThemePicker({ compact = false }) {
    const { primary, setPrimary, resetTheme, isDefault } = useTheme()

    return (
        <div className={compact ? 'w-64' : 'w-full'}>
            <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary">Accent color</span>
                <Button
                    size="small"
                    type="text"
                    icon={<ReloadOutlined />}
                    disabled={isDefault}
                    onClick={resetTheme}
                    style={{ color: 'var(--color-text-secondary)' }}
                >
                    Reset
                </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
                {THEME_PRESETS.map((p) => {
                    const selected = p.primary.toLowerCase() === primary.toLowerCase()
                    return (
                        <button
                            key={p.key}
                            title={p.name}
                            onClick={() => setPrimary(p.primary)}
                            className="flex h-10 items-center justify-center rounded-xl transition-transform hover:scale-105"
                            style={{
                                background: p.primary,
                                boxShadow: selected ? `0 0 0 3px var(--color-surface), 0 0 0 5px ${p.primary}` : 'none',
                            }}
                            aria-label={p.name}
                        >
                            {selected && <CheckOutlined style={{ color: '#fff' }} />}
                        </button>
                    )
                })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: 'var(--color-surface-secondary)' }}>
                <span className="text-sm font-medium text-text-secondary">Custom color</span>
                <ColorPicker
                    value={primary}
                    onChangeComplete={(c) => setPrimary(c.toHexString())}
                    presets={[{ label: 'Recommended', colors: THEME_PRESETS.map((p) => p.primary) }]}
                />
            </div>
        </div>
    )
}
