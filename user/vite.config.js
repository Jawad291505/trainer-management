import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Shared library JSON lives at the workspace root in /data and is consumed by
// the admin, trainer and client apps. `@data` resolves to that folder and
// server.fs.allow lets Vite serve files from outside this app's root.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@data': fileURLToPath(new URL('../data', import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Stable vendor chunks: the (large) UI/chart libraries change far less
                // often than app code, so browsers keep them cached across deploys, and
                // charts only load with the pages that draw them.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return undefined
                    if (/[\/](recharts|d3-[^\/]+|victory-vendor|recharts-scale)[\/]/.test(id)) return 'charts'
                    if (/[\/](antd|@ant-design|@rc-component|rc-[^\/]+)[\/]/.test(id)) return 'antd'
                    if (/[\/](react|react-dom|react-router|react-router-dom|@remix-run|scheduler)[\/]/.test(id)) return 'react'
                    return undefined
                },
            },
        },
    },
    server: {
        port: 5175,
        open: false,
        fs: {
            allow: ['..'],
        },
    },
})
