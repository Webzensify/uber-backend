import mongoose from 'mongoose'

const {Schema} = mongoose
const UserSchema = new Schema({
    email: {
        type: "string",
        required: true,
        unique: true
    },
    phoneNo: {
        type: "string",
        required: true,
        unique: true
    },
    password: {
        type: "string",
        required: true
    },
    role: {
        type: "string",
        required: true
    },
    createdOn: {
        type: Date,
        default: Date.now
    }
})
export default mongoose.model("User", UserSchema, "users")