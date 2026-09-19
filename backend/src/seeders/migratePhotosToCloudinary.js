/**
 * One-off migration: move progress photos stored as base64 data URLs in MongoDB
 * to Cloudinary, keeping only the delivery URL (+ public_id) on the document.
 *
 *   npm run migrate:photos            # upload + rewrite
 *   npm run migrate:photos -- --dry   # just list what would be moved
 *
 * Idempotent: rows already pointing at a URL are skipped, and each photo is
 * rewritten only after its upload succeeds, so a failed run can simply be re-run.
 */
import { connectDb, disconnectDb } from '../config/db.js'
import { ProgressPhoto } from '../models/index.js'
import { isCloudinaryConfigured, uploadProgressPhoto } from '../services/cloudinary.service.js'

const dry = process.argv.includes('--dry')

async function main() {
    if (!dry && !isCloudinaryConfigured()) {
        throw new Error('Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)')
    }
    await connectDb()

    // Ids only first — the base64 payloads are loaded one photo at a time below.
    const legacy = await ProgressPhoto.find({ image: /^data:/ }).select('_id client').lean()
    console.log(`[migrate] ${legacy.length} photo(s) still stored as base64`)
    if (dry) return

    let moved = 0
    for (const { _id, client } of legacy) {
        try {
            const photo = await ProgressPhoto.findById(_id)
            if (!photo || !photo.image.startsWith('data:')) continue
            const { url, publicId } = await uploadProgressPhoto(photo.image, { clientId: client })
            photo.image = url
            photo.imagePublicId = publicId
            await photo.save()
            moved += 1
            console.log(`[migrate] ${_id} -> ${url}`)
        } catch (err) {
            console.error(`[migrate] ${_id} failed: ${err.message}`)
        }
    }
    console.log(`[migrate] done — moved ${moved}/${legacy.length}`)
}

main()
    .catch((err) => {
        console.error('[migrate] failed:', err)
        process.exitCode = 1
    })
    .finally(() => disconnectDb())
