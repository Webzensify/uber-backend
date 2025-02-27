const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    mobileNumber: {type: String, required: false, unique: true},
    gender: {type: String, required: false},
    isVerified: {type: Boolean, default: false},
    fcmToken: {type: String}, // For Firebase notifications
    name: {type: String},
    aadhaarCard: {type: String},
    email: {type: String, required: true},
    password: {type: String, required: true}
});

module.exports = mongoose.model('User', userSchema);