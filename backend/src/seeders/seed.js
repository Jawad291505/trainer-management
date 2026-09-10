import { connectDb, disconnectDb } from '../config/db.js'
import { env } from '../config/env.js'
import { seedMasterData } from './seedMaster.js'
import { seedDemoData } from './seedDemo.js'

// Usage:
//   npm run seed                 -> master data (+ demo accounts if SEED_DEMO=true)
//   npm run seed -- --only=master
//   npm run seed -- --only=demo
const onlyArg = process.argv.find((a) => a.startsWith('--only='))
const only = onlyArg ? onlyArg.split('=')[1] : null

async function main() {
    await connectDb()
    console.log('[seed] connected — starting')

    if (only !== 'demo') {
        const master = await seedMasterData()
        console.log('[seed] master data:', master)
    }

    const wantDemo = only === 'demo' || (only == null && env.seedDemo)
    if (wantDemo) {
        const demo = await seedDemoData()
        console.log('[seed] demo data:', demo)
        console.log(`[seed] demo accounts use password: ${demo.demoPassword}`)
        console.log('[seed] e.g. admin: alexandra.reed@fittrack.io | trainer: marcus.bennett@fittrack.io | client: emma.thompson@gmail.com')
    }

    await disconnectDb()
    console.log('[seed] done')
    process.exit(0)
}

main().catch((err) => {
    console.error('[seed] failed:', err)
    process.exit(1)
})
