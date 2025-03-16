import mongoose from 'mongoose'
import {dbPassword} from './config.js'
const dbName = "traveloBackend"
const uri = `mongodb+srv://aryangupta:${dbPassword}@cluster0.il7jb.mongodb.net/${dbName}`

export const connectToMongo = async() => {
    await mongoose.connect(uri).then(() => {
        console.log("Database connected")
    }).catch((err) => {
        console.log(err)
    })
}

