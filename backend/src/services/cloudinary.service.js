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
