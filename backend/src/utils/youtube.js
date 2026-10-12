// YouTube link validation for the Techniques Library. Accepts the URL shapes
// YouTube actually hands out (watch, youtu.be, shorts, embed, live) and returns
// the 11-character video id — the same rules as the frontends' utils/youtube.js,
// so a link the form accepts is never rejected here.
const HOSTS = new Set(['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'youtu.be'])
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const PATH_PREFIXES = ['embed', 'shorts', 'live', 'v']

// → the video id, or null when `input` isn't a YouTube video link.
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

// → the trimmed link with an explicit https:// scheme, or null when invalid.
export function normalizeYouTubeUrl(input) {
    if (!parseYouTubeId(input)) return null
    const raw = String(input).trim()
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}
