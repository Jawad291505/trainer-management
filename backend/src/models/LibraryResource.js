import mongoose from 'mongoose'
import { LIBRARY_RESOURCE_CATEGORIES, ACCOUNT_STATUS } from '../config/constants.js'

// Admin "Library Management" — external resources (mostly Google Drive / YouTube
// links). admin/src/services/mockData.js `libraryResources[]`.
// This is unrelated to the food/exercise master libraries; it is a link catalog.
const libraryResourceSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        category: { type: String, enum: LIBRARY_RESOURCE_CATEGORIES, required: true, index: true },
        description: { type: String, default: '' },
        url: { type: String, required: true, trim: true },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    },
    { timestamps: true },
)

export const LibraryResource = mongoose.model('LibraryResource', libraryResourceSchema)
