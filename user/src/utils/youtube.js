// YouTube link helpers for technique videos — the same rules as the
// backend's utils/youtube.js, so a link accepted here is accepted by the API.
const HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'])
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v']

// → the 11-character video id, or null when `input` isn't a YouTube video link.
export function parseYouTubeId(input) {
    const raw = String(input || '').trim()
    if (!raw) return null

    let url
    try {
        url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    } catch {
        return null
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (!HOSTS.has(host)) return null

    const parts = url.pathname.split('/').filter(Boolean)
    let id = null
    if (host === 'youtu.be') id = parts[0]
    else if (parts[0] === 'watch') id = url.searchParams.get('v')
    else if (PATH_PREFIXES.includes(parts[0])) id = parts[1]

    return id && VIDEO_ID.test(id) ? id : null
}

export const youtubeThumbnail = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
export const youtubeEmbedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`

// antd Form rule: passes on empty (pair it with `required`) or a valid YouTube link.
export const youtubeRule = {
    validator: (_, value) =>
        !value || parseYouTubeId(value)
            ? Promise.resolve()
            : Promise.reject(new Error('Enter a valid YouTube video link')),
}
