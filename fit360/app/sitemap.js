// Generates /sitemap.xml at build time.
export default function sitemap() {
    return [
        {
            url: 'https://fit360.app',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 1,
        },
    ]
}
