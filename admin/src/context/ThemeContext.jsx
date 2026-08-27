import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { DEFAULT_PRIMARY, THEME_STORAGE_KEY } from '../constants/theme'
import { shade, soft, rgbString, readableOn } from '../utils/color'

const ThemeContext = createContext(null)

// Applies the chosen primary color to the document as CSS variables so
// the whole app (Tailwind utilities + custom CSS) reacts instantly.
function applyPrimary(primary) {
    const root = document.documentElement
    root.style.setProperty('--color-primary', primary)
    root.style.setProperty('--color-primary-dark', shade(primary, -0.2))
    root.style.setProperty('--color-primary-light', shade(primary, 0.25))
    root.style.setProperty('--color-primary-soft', soft(primary, 0.9))
    root.style.setProperty('--color-primary-rgb', rgbString(primary))
    root.style.setProperty('--color-on-primary', readableOn(primary))
}

export function ThemeProvider({ children }) {
    const [primary, setPrimary] = useState(() => {
        if (typeof window === 'undefined') return DEFAULT_PRIMARY
        return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_PRIMARY
    })

    useEffect(() => {
        applyPrimary(primary)
        localStorage.setItem(THEME_STORAGE_KEY, primary)
    }, [primary])

    const resetTheme = useCallback(() => setPrimary(DEFAULT_PRIMARY), [])

    const value = useMemo(
        () => ({
            primary,
            setPrimary,
            resetTheme,
            isDefault: primary.toLowerCase() === DEFAULT_PRIMARY.toLowerCase(),
        }),
        [primary, resetTheme],
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
    return ctx
}
