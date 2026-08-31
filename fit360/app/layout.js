import './globals.css'
import { Inter, Fraunces } from 'next/font/google'

const inter = Inter({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-inter',
    weight: ['400', '500', '600', '700'],
})

const fraunces = Fraunces({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-fraunces',
    style: ['normal', 'italic'],
    axes: ['opsz'],
})

const SITE_URL = 'https://fit360.app'
const TITLE = 'Fit360 — Premium Fitness Coaching Platform'
const DESCRIPTION =
    'Fit360 connects driven clients with expert trainers. Register as a client, register as a trainer, and get matched with a coach who fits your goals — nutrition, training and progress in one premium platform.'

export const metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: TITLE,
        template: '%s · fit360',
    },
    description: DESCRIPTION,
    applicationName: 'Fit360',
    keywords: [
        'fitness coaching',
        'personal trainer platform',
        'online fitness trainer',
        'diet and workout plans',
        'client trainer matching',
        'Fit360',
    ],
    authors: [{ name: 'Fit360' }],
    creator: 'Fit360',
    publisher: 'Fit360',
    alternates: {
        canonical: SITE_URL,
    },
    openGraph: {
        type: 'website',
        url: SITE_URL,
        siteName: 'fit360',
        title: TITLE,
        description: DESCRIPTION,
        locale: 'en_US',
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
        creator: '@fit360',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
    },
    category: 'fitness',
}

export const viewport = {
    themeColor: '#f4f0e8',
    width: 'device-width',
    initialScale: 1,
}

// JSON-LD structured data for richer search results.
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Fit360',
    url: SITE_URL,
    description: DESCRIPTION,
    sameAs: ['https://twitter.com/fit360', 'https://instagram.com/fit360'],
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </head>
            <body>{children}</body>
        </html>
    )
}
