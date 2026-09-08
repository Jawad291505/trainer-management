// Turn a user-picked image File into a downscaled JPEG data URL so progress
// photos can live in localStorage without blowing the quota. Longest side is
// clamped to `maxDim`; non-images and oversized files are rejected up front.
const MAX_BYTES = 8 * 1024 * 1024

export function fileToResizedDataUrl(file, maxDim = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type?.startsWith('image/')) {
            reject(new Error('Please choose an image file.'))
            return
        }
        if (file.size > MAX_BYTES) {
            reject(new Error('That image is too large (max 8MB).'))
            return
        }

        const reader = new FileReader()
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error('That file is not a valid image.'))
            img.onload = () => {
                const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
                const w = Math.round(img.width * scale)
                const h = Math.round(img.height * scale)
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL('image/jpeg', quality))
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}
