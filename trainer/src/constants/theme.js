// Preset accent colors offered by the global theme picker.
// The default is Premium Navy.
export const THEME_PRESETS = [
    { key: 'navy', name: 'Premium Navy', primary: '#0b2545' },
    { key: 'indigo', name: 'Indigo', primary: '#4338ca' },
    { key: 'emerald', name: 'Emerald', primary: '#047857' },
    { key: 'violet', name: 'Violet', primary: '#7c3aed' },
    { key: 'rose', name: 'Rose', primary: '#be123c' },
    { key: 'amber', name: 'Amber', primary: '#b45309' },
    { key: 'teal', name: 'Teal', primary: '#0f766e' },
    { key: 'slate', name: 'Graphite', primary: '#334155' },
]

export const DEFAULT_PRIMARY = THEME_PRESETS[0].primary
export const THEME_STORAGE_KEY = 'fittrack.theme.primary'
