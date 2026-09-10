import mongoose from 'mongoose'

// One private chat room per trainer<->client pair (trainer Messages page +
// client Messages page). trainer/src/services/mockData.js `conversations` /
// `messagesByClient`.
const conversationSchema = new mongoose.Schema(
    {
        trainer: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true, index: true },
        client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        lastMessage: { type: String, default: '' },
        lastMessageAt: { type: Date, default: null },
        // Unread counts kept per side for the conversation-list badges.
        unreadForTrainer: { type: Number, default: 0 },
        unreadForClient: { type: Number, default: 0 },
    },
    { timestamps: true },
)

conversationSchema.index({ trainer: 1, client: 1 }, { unique: true })

export const Conversation = mongoose.model('Conversation', conversationSchema)
