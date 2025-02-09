import mongoose from "mongoose"
const {Schema} = mongoose
const DriverSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    aadharCard: {
        type: "String",
        required: true
    },
    driverLicense: {
        type: "String",
        required: true
    },
    profilePic: {
        type: "String",
        required: true
    }
})
