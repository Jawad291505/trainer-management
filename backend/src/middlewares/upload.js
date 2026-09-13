import multer from 'multer'

// In-memory storage — files are streamed straight to Cloudinary
// (services/cloudinary.service.js) and never touch disk.
const storage = multer.memoryStorage()

function imageOnly(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
        return cb(Object.assign(new Error('Only image files are allowed'), { statusCode: 400 }))
    }
    cb(null, true)
}

export const uploadImage = multer({
    storage,
    fileFilter: imageOnly,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — a phone screenshot fits comfortably
})
