// Web app manifest for PWA-style metadata.
export default function manifest() {
    return {
        name: 'Fit360 — Premium Fitness Coaching',
        short_name: 'Fit360',
        description: 'Register as a client or trainer and get matched with the right coach.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f0e8',
        theme_color: '#0b2545',
    }
}
