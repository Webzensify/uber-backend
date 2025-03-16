const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    mobileNumber: {type: String, required: false, unique: false},
    gender: {type: String, required: false},
    isVerified: {type: Boolean, default: true},
    fcmToken: {type: String}, // For Firebase notifications
    name: {type: String},
    aadhaarCard: {type: String},
});

module.exports = mongoose.model('User', userSchema);