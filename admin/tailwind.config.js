/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                // Bind Tailwind utilities to CSS variables so the whole theme
                // can be changed from one place (see styles/global.css).
                primary: 'var(--color-primary)',
                'primary-dark': 'var(--color-primary-dark)',
                'primary-light': 'var(--color-primary-light)',
                background: 'var(--color-background)',
                surface: 'var(--color-surface)',
                'surface-secondary': 'var(--color-surface-secondary)',
                'text-primary': 'var(--color-text-primary)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-muted': 'var(--color-text-muted)',
                border: 'var(--color-border)',
                success: 'var(--color-success)',
                warning: 'var(--color-warning)',
                danger: 'var(--color-danger)',
                info: 'var(--color-info)',
            },
            borderRadius: {
                xl: '14px',
                '2xl': '18px',
            },
            boxShadow: {
                card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
                'card-hover': '0 4px 12px rgba(16, 24, 40, 0.08), 0 2px 6px rgba(16, 24, 40, 0.05)',
                soft: '0 8px 24px rgba(16, 24, 40, 0.08)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
            },
        },
    },
    corePlugins: {
        preflight: false, // avoid clashing with Ant Design's reset
    },
    plugins: [],
}
