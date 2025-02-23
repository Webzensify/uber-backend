const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  gender: {type: String, required: true},
  isVerified: { type: Boolean, default: false },
  fcmToken: { type: String }, // For Firebase notifications
  name: { type: String },
});

module.exports = mongoose.model('User', userSchema);