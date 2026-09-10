import mongoose from 'mongoose'
import { PROGRESS_PHOTO_ANGLES } from '../config/constants.js'

// Client progress photos + the trainer's per-photo feedback note.
// user ProgressPhotos component + trainer/src/context/ProgressPhotosContext.jsx.
// The front-end stores images as data URLs; `image` keeps that contract (a data
// URL or, later, an uploaded-file URL).
const progressPhotoSchema = new mongoose.Schema(
    {
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', default: null, index: true },

        date: { type: Date, required: true }, // date the photo was taken
        image: { type: String, required: true }, // data URL / file URL
        angle: { type: String, enum: PROGRESS_PHOTO_ANGLES, default: 'front' },
        caption: { type: String, default: '' },

        note: { type: String, default: '' }, // trainer feedback
        noteAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export const ProgressPhoto = mongoose.model('ProgressPhoto', progressPhotoSchema)
