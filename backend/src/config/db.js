import mongoose from 'mongoose'
import { env } from './env.js'

mongoose.set('strictQuery', true)

export async function connectDb(uri = env.mongoUri) {
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
    })
    const { host, name } = mongoose.connection
    console.log(`[db] connected to ${host}/${name}`)
    return mongoose.connection
}

export async function disconnectDb() {
    await mongoose.disconnect()
}
