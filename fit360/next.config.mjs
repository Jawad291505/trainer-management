/** @type {import('next').NextConfig} */
const nextConfig = {
    // Static export — this is a static marketing SPA, no server runtime needed.
    output: 'export',
    images: {
        unoptimized: true,
    },
    reactStrictMode: true,
}

export default nextConfig
