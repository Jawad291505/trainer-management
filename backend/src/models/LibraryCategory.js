import mongoose from 'mongoose'
import { slugify } from '../utils/slugify.js'

// Category lists for the food & exercise libraries. Seeded from the `categories`
// arrays in data/foodLibrary.json and data/exerciseLibrary.json. Foods/Exercises
// reference a category by its display `name` (that is how the source data and
// every front-end picker work); `slug` is the stable key per data/README.md so a
// category can be renamed later without breaking references.
const libraryCategorySchema = new mongoose.Schema(
    {
        kind: { type: String, enum: ['food', 'exercise'], required: true, index: true },
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true },
)

libraryCategorySchema.index({ kind: 1, slug: 1 }, { unique: true })

libraryCategorySchema.pre('validate', function (next) {
    if (this.name && !this.slug) this.slug = slugify(this.name)
    next()
})

export const LibraryCategory = mongoose.model('LibraryCategory', libraryCategorySchema)
