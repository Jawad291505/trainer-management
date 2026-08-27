// Small color helpers used by the theme system to derive
// dark/light/soft variants and ensure accessible contrast.

export function hexToRgb(hex) {
    const clean = hex.replace('#', '')
    const full = clean.length === 3
        ? clean.split('').map((c) => c + c).join('')
        : clean
    const num = parseInt(full, 16)
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
    }
}

export function rgbToHex(r, g, b) {
    const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
    return `#${to(r)}${to(g)}${to(b)}`
}

// amount: -1..1 (negative darkens, positive lightens)
export function shade(hex, amount) {
    const { r, g, b } = hexToRgb(hex)
    if (amount >= 0) {
        return rgbToHex(
            r + (255 - r) * amount,
            g + (255 - g) * amount,
            b + (255 - b) * amount,
        )
    }
    const f = 1 + amount
    return rgbToHex(r * f, g * f, b * f)
}

// Very light tint used for soft backgrounds / selected states.
export function soft(hex, amount = 0.9) {
    return shade(hex, amount)
}

export function rgbString(hex) {
    const { r, g, b } = hexToRgb(hex)
    return `${r}, ${g}, ${b}`
}

// Relative luminance for choosing readable text over a color.
export function luminance(hex) {
    const { r, g, b } = hexToRgb(hex)
    const a = [r, g, b].map((v) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}

export function readableOn(hex) {
    return luminance(hex) > 0.55 ? '#10192b' : '#ffffff'
}
