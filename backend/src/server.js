import http from 'node:http'
import { createApp } from './app.js'
import { connectDb } from './config/db.js'
import { env } from './config/env.js'
import { initRealtime } from './realtime/index.js'
import { startFollowUpReminderJob } from './services/followUpReminders.service.js'
import { warmLibraryCaches } from './services/libraryCache.js'

async function main() {
    await connectDb()

    const app = createApp()
    const server = http.createServer(app)

    // Attach Socket.IO to the same HTTP server (shares the port).
    initRealtime(server)

    // Day-before / day-of client reminders and trainer overdue alerts.
    startFollowUpReminderJob()

    server.listen(env.port, () => {
        console.log(`[server] FitTrack API + realtime on http://localhost:${env.port}  (${env.nodeEnv})`)
    })

    // Fill the reference-data caches in the background so the first library /
    // diet-plan request doesn't wait on the database.
    warmLibraryCaches()
}

main().catch((err) => {
    console.error('[server] failed to start:', err)
    process.exit(1)
})
