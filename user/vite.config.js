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
    server: {
        port: 5175,
        open: false,
        fs: {
            allow: ['..'],
        },
    },
})
