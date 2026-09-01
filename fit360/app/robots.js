// Generates /robots.txt at build time.
export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: 'https://fit360.app/sitemap.xml',
    }
}
