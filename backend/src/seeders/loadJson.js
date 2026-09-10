import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// The master library JSON lives at the workspace root in /data — the same files
// the admin and trainer front-ends import via the `@data` Vite alias
// (see data/README.md). backend/src/seeders -> ../../../data
const DATA_DIR = path.resolve(fileURLToPath(new URL('../../../data', import.meta.url)))

export async function loadData(fileName) {
    const full = path.join(DATA_DIR, fileName)
    const raw = await readFile(full, 'utf8')
    return JSON.parse(raw)
}

export { DATA_DIR }
