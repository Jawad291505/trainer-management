import http from 'node:http'
import https from 'node:https'
import dns from 'node:dns'
import net from 'node:net'
import ApiError from '../utils/ApiError.js'

// Fetches a public web page and pulls out the bits a link card needs (title,
// image, site name) from its Open Graph / Twitter / <title> tags. Used for the
// purchase links trainers attach to meal supplements.
//
// The URL comes from a user, so the request is locked down against SSRF: only
// http(s) on the default ports, and every address the host resolves to — on the
// first hop and on each redirect — must be public. The check lives in the
// socket's own DNS lookup, so the address that was checked is the one connected to.

const TIMEOUT_MS = 7000
const MAX_BYTES = 512 * 1024
const MAX_REDIRECTS = 4
const USER_AGENT = 'Mozilla/5.0 (compatible; FitTrackLinkPreview/1.0; +link-preview)'

const blocked = new net.BlockList()
for (const [addr, bits] of [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
    ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(addr, bits, 'ipv4')
for (const [addr, bits] of [
    ['::', 127], // :: and ::1
    ['64:ff9b::', 96], // NAT64
    ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
]) blocked.addSubnet(addr, bits, 'ipv6')

const isBlockedAddress = (address) => {
    const family = net.isIP(address)
    if (!family) return true
    // IPv4-mapped IPv6 is refused outright — a BlockList subnet for it would
    // also match every plain IPv4 address.
    if (family === 6 && /^::ffff:/i.test(address)) return true
    return blocked.check(address, family === 6 ? 'ipv6' : 'ipv4')
}

// dns.lookup that refuses to hand back a private/loopback address.
function guardedLookup(hostname, options, callback) {
    dns.lookup(hostname, options, (err, address, family) => {
        if (err) return callback(err)
        const all = Array.isArray(address) ? address.map((a) => a.address) : [address]
        if (all.some(isBlockedAddress)) return callback(new Error('Address not allowed'))
        callback(null, address, family)
    })
}

// Validate + normalise a user-supplied URL, or throw a 400.
export function parsePublicUrl(raw) {
    let url
    try {
        url = new URL(String(raw || '').trim())
    } catch {
        throw ApiError.badRequest('Enter a valid URL')
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw ApiError.badRequest('Only http and https links are supported')
    if (url.port && url.port !== '80' && url.port !== '443') throw ApiError.badRequest('That link cannot be previewed')
    if (url.username || url.password) throw ApiError.badRequest('That link cannot be previewed')
    const host = url.hostname.replace(/^\[|\]$/g, '')
    if (!host || host === 'localhost' || host.endsWith('.localhost') || (net.isIP(host) && isBlockedAddress(host))) {
        throw ApiError.badRequest('That link cannot be previewed')
    }
    return url
}

// GET one URL (no redirect following) and resolve with { status, location, html }.
function fetchOnce(url) {
    return new Promise((resolve, reject) => {
        const lib = url.protocol === 'https:' ? https : http
        const req = lib.get(
            url,
            {
                lookup: guardedLookup,
                timeout: TIMEOUT_MS,
                headers: {
                    'User-Agent': USER_AGENT,
                    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
                    'Accept-Language': 'en',
                    'Accept-Encoding': 'identity',
                },
            },
            (res) => {
                const status = res.statusCode || 0
                if (status >= 300 && status < 400 && res.headers.location) {
                    res.resume()
                    return resolve({ status, location: res.headers.location, html: '' })
                }
                const type = String(res.headers['content-type'] || '')
                if (status >= 400 || (type && !/html|xml/i.test(type))) {
                    res.destroy()
                    return resolve({ status, html: '' })
                }
                const chunks = []
                let size = 0
                const finish = () => resolve({ status, html: Buffer.concat(chunks).toString('utf8') })
                res.on('data', (chunk) => {
                    chunks.push(chunk)
                    size += chunk.length
                    // Everything we need lives in <head>; stop as soon as it closes.
                    if (size >= MAX_BYTES || chunk.includes('</head>')) {
                        res.destroy()
                        finish()
                    }
                })
                res.on('end', finish)
                res.on('error', finish)
            },
        )
        req.on('timeout', () => req.destroy(new Error('Timed out')))
        req.on('error', reject)
    })
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
const decode = (s) =>
    String(s || '')
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d) || 32))
        .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name.toLowerCase()] ?? m)
        .replace(/\s+/g, ' ')
        .trim()

// Collect <meta property|name=… content=…> into a lower-cased key -> content map
// (first occurrence wins).
function metaTags(html) {
    const out = new Map()
    for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
        const attrs = {}
        for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
            attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? ''
        }
        const key = (attrs.property || attrs.name || '').toLowerCase()
        if (key && attrs.content && !out.has(key)) out.set(key, attrs.content)
    }
    return out
}

const absoluteHttpUrl = (value, base) => {
    try {
        const u = new URL(decode(value), base)
        return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null
    } catch {
        return null
    }
}

const siteFromHost = (url) => url.hostname.replace(/^www\./i, '')

// Resolve link-card metadata for `rawUrl`. An invalid or non-public URL throws a
// 400; a page that can't be reached or has no metadata still resolves, with just
// the site name — the link itself is fine, there's simply nothing richer to show.
export async function fetchLinkPreview(rawUrl) {
    const requested = parsePublicUrl(rawUrl)
    const fallback = { url: requested.href, title: '', description: '', image: null, siteName: siteFromHost(requested) }

    let current = requested
    let html = ''
    try {
        for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
            const res = await fetchOnce(current)
            if (!res.location) {
                html = res.html
                break
            }
            current = parsePublicUrl(new URL(res.location, current).href)
        }
    } catch {
        return fallback
    }
    if (!html) return fallback

    const meta = metaTags(html)
    const pick = (...keys) => {
        for (const k of keys) if (meta.get(k)) return meta.get(k)
        return ''
    }
    const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
    const image = pick('og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src')

    return {
        url: requested.href,
        title: decode(pick('og:title', 'twitter:title') || titleTag).slice(0, 200),
        description: decode(pick('og:description', 'twitter:description', 'description')).slice(0, 300),
        image: image ? absoluteHttpUrl(image, current) : null,
        siteName: decode(pick('og:site_name')).slice(0, 80) || siteFromHost(current),
    }
}
