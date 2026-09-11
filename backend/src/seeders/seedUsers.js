/**
 * Seed the three portal login accounts:
 *   admin@fit360.com   (admin)
 *   trainer@fit360.com (trainer)
 *   client@fit360.com  (client)
 *
 * Usage:  node src/seeders/seedUsers.js
 */
import { connectDb, disconnectDb } from '../config/db.js'
import { hashPassword } from '../utils/password.js'
import { ensureReferralCode } from '../services/referral.service.js'
import { User, Trainer, Client } from '../models/index.js'

const PASSWORD = 'Fit360@123abc'

const ACCOUNTS = [
    {
        name: 'Fit360 Admin',
        email: 'admin@fit360.com',
        role: 'admin',
        avatarColor: '#0b2545',
    },
    {
        name: 'Fit360 Trainer',
        email: 'trainer@fit360.com',
        role: 'trainer',
        avatarColor: '#7c3aed',
        trainerMeta: {
            specialization: 'Strength & Conditioning',
            capacity: 25,
        },
    },
    {
        name: 'Fit360 Client',
        email: 'client@fit360.com',
        role: 'client',
        avatarColor: '#047857',
        clientMeta: {
            goal: 'Fat Loss',
            plan: 'Premium',
            startWeight: 80,
            weight: 75,
            target: 70,
        },
    },
]

async function main() {
    await connectDb()
    console.log('[seedUsers] connected')

    const hash = await hashPassword(PASSWORD)

    for (const acct of ACCOUNTS) {
        let user = await User.findOne({ email: acct.email.toLowerCase() })
        if (user) {
            console.log(`  ✓ ${acct.email} already exists — updating`)
            user.name = acct.name
            user.role = acct.role
            user.avatarColor = acct.avatarColor
            user.status = 'active'
            user.passwordHash = hash
            await user.save()
        } else {
            user = await User.create({
                name: acct.name,
                email: acct.email,
                role: acct.role,
                avatarColor: acct.avatarColor,
                status: 'active',
                passwordHash: hash,
            })
            console.log(`  + Created ${acct.email}`)
        }

        // Create/update Trainer profile
        if (acct.role === 'trainer' && acct.trainerMeta) {
            let trainer = await Trainer.findOne({ user: user._id })
            if (!trainer) {
                trainer = await Trainer.create({
                    user: user._id,
                    ...acct.trainerMeta,
                })
                console.log('    + Created Trainer profile')
            } else {
                Object.assign(trainer, acct.trainerMeta)
                await trainer.save()
                console.log('    ✓ Updated Trainer profile')
            }
            await ensureReferralCode(trainer)
        }

        // Create/update Client profile — assign to the trainer we just created
        if (acct.role === 'client' && acct.clientMeta) {
            const trainerUser = await User.findOne({ email: 'trainer@fit360.com' })
            const trainer = trainerUser ? await Trainer.findOne({ user: trainerUser._id }) : null

            let client = await Client.findOne({ user: user._id })
            if (!client) {
                client = await Client.create({
                    user: user._id,
                    trainer: trainer?._id || null,
                    ...acct.clientMeta,
                })
                console.log('    + Created Client profile')
            } else {
                Object.assign(client, acct.clientMeta)
                if (trainer) client.trainer = trainer._id
                await client.save()
                console.log('    ✓ Updated Client profile')
            }

            // Sync trainer client count
            if (trainer) {
                trainer.clientCount = await Client.countDocuments({ trainer: trainer._id })
                await trainer.save()
            }
        }
    }

    console.log('\n[seedUsers] Done! Accounts:')
    console.log('  admin@fit360.com    / Fit360@123abc  (admin)')
    console.log('  trainer@fit360.com  / Fit360@123abc  (trainer)')
    console.log('  client@fit360.com   / Fit360@123abc  (client)')

    await disconnectDb()
    process.exit(0)
}

main().catch((err) => {
    console.error('[seedUsers] failed:', err)
    process.exit(1)
})
