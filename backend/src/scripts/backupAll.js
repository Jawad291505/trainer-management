/**
 * Full-database backup: dumps every collection to a JSON file.
 * Used as a safety net before resetToClean.js --execute.
 *
 * Usage: node src/scripts/backupAll.js
 */
import fs from 'node:fs'
import path from 'node:path'
import { connectDb, disconnectDb } from '../config/db.js'

async function main() {
    const conn = await connectDb()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outDir = path.resolve(process.cwd(), 'backups', stamp)
    fs.mkdirSync(outDir, { recursive: true })

    const collections = await conn.db.listCollections().toArray()
    console.log(`[backupAll] backing up ${collections.length} collections to ${outDir}`)

    for (const { name } of collections) {
        const docs = await conn.db.collection(name).find({}).toArray()
        fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(docs, null, 2))
        console.log(`  ${String(docs.length).padStart(6)}  ${name}`)
    }

    console.log(`[backupAll] done — backup saved at ${outDir}`)
    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error('[backupAll] failed:', err)
    process.exit(1)
})
