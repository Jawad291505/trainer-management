import mongoose from 'mongoose'

// A single chat message inside a Conversation. `from` mirrors the front-end
// mock shape ({ from: 'trainer' | 'client', text, time }).
const messageSchema = new mongoose.Schema(
    {
        conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
        from: { type: String, enum: ['trainer', 'client'], required: true },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        readAt: { type: Date, default: null },
    },
    { timestamps: true },
)

export const Message = mongoose.model('Message', messageSchema)
