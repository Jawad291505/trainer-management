import mongoose from 'mongoose'
import { PROGRESS_PHOTO_ANGLES } from '../config/constants.js'

// Client progress photos + the trainer's per-photo feedback note.
// user ProgressPhotos component + trainer/src/context/ProgressPhotosContext.jsx.
// Images live on Cloudinary: `image` is the delivery URL (what both front-ends put
// in <img src>) and `imagePublicId` lets the server delete the asset. Rows created
// before the move may still hold a base64 data URL until seeders/migratePhotosToCloudinary.js runs.
const progressPhotoSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },

        date: { type: Date, required: true }, // date the photo was taken
        image: { type: String, required: true }, // Cloudinary URL (legacy rows: data URL)
        imagePublicId: { type: String, default: '' }, // Cloudinary public_id, '' for legacy rows
        angle: { type: String, enum: PROGRESS_PHOTO_ANGLES, default: 'front' },
        caption: { type: String, default: '' },

        note: { type: String, default: '' }, // trainer feedback
        noteAt: { type: Date, default: null },
    },
    { timestamps: true },
)

// Emit the `id` virtual — both front-ends key photos by `id`.
progressPhotoSchema.set('toJSON', { virtuals: true })

// Photo list: a client's photos, newest first.
progressPhotoSchema.index({ client: 1, date: -1, createdAt: -1 })

export const ProgressPhoto = mongoose.model('ProgressPhoto', progressPhotoSchema)
