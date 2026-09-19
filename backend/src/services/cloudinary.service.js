import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

const configured = !!(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret)

if (configured) {
    cloudinary.config({
        cloud_name: env.cloudinaryCloudName,
        api_key: env.cloudinaryApiKey,
        api_secret: env.cloudinaryApiSecret,
        secure: true,
    })
}

export const isCloudinaryConfigured = () => configured

function assertConfigured(what) {
    if (!configured) {
        throw new Error(`${what} are not available yet — Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).`)
    }
}

// Uploads a progress photo (a base64 data URL from the client app) and returns
// its Cloudinary reference — the database keeps only the URL, never the bytes.
// Only data URLs are accepted: cloudinary.uploader.upload would otherwise fetch
// any remote URL it's handed.
export async function uploadProgressPhoto(dataUrl, { clientId }) {
    assertConfigured('Progress photo uploads')
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        throw new Error('Progress photo must be an image data URL')
    }
    const result = await cloudinary.uploader.upload(dataUrl, {
        folder: 'fittrack/progress-photos',
        public_id: `client-${clientId}-${Date.now()}`,
        resource_type: 'image',
    })
    return { url: result.secure_url, publicId: result.public_id }
}

const PROGRESS_PHOTO_FOLDER = 'fittrack/progress-photos'

// Signed parameters that let the browser upload N progress photos straight to
// Cloudinary (the bytes never touch this server). Each photo gets its own
// server-chosen public_id, and the signature only authorizes that exact upload.
export function signProgressPhotoUploads({ clientId, count }) {
    assertConfigured('Progress photo uploads')
    const timestamp = Math.round(Date.now() / 1000)
    return {
        cloudName: env.cloudinaryCloudName,
        apiKey: env.cloudinaryApiKey,
        folder: PROGRESS_PHOTO_FOLDER,
        uploads: Array.from({ length: count }, (_, i) => {
            const publicId = `client-${clientId}-${Date.now()}-${i}`
            const signature = cloudinary.utils.api_sign_request(
                { folder: PROGRESS_PHOTO_FOLDER, public_id: publicId, timestamp },
                env.cloudinaryApiSecret,
            )
            return { publicId, timestamp, signature }
        }),
    }
}

// True when a photo reference sent by the browser really is one of this client's
// uploads on our Cloudinary account — stops a client pointing a photo at any URL.
export function isOwnProgressPhoto({ url, publicId }, clientId) {
    return (
        configured &&
        typeof url === 'string' &&
        typeof publicId === 'string' &&
        publicId.startsWith(`${PROGRESS_PHOTO_FOLDER}/client-${clientId}-`) &&
        url.startsWith(`https://res.cloudinary.com/${env.cloudinaryCloudName}/`) &&
        url.includes(publicId)
    )
}

// Best-effort removal of an uploaded asset (a missing asset is not an error).
export async function deleteImage(publicId) {
    if (!configured || !publicId) return
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })
}

// Uploads a payment-proof screenshot (buffer from multer memoryStorage) and
// returns the Cloudinary reference to store on MemberPayment — never the raw
// image bytes. Throws a clear error if Cloudinary isn't configured yet, rather
// than accepting the upload and quietly losing the file.
export function uploadPaymentProof(buffer, { memberId }) {
    if (!configured) {
        throw new Error('Payment screenshot uploads are not available yet — Cloudinary is not configured (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET).')
    }
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'fittrack/payment-proofs',
                public_id: `member-${memberId}-${Date.now()}`,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) return reject(error)
                resolve({ url: result.secure_url, publicId: result.public_id })
            },
        )
        stream.end(buffer)
    })
}
