import mongoose from "mongoose"
const {Schema} = mongoose
const AdminSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        unique: true
    }
})