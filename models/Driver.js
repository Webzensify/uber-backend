const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  mobileNumber: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  name: { type: String },
  licenseNumber: { type: String},
  aadhaarNumber: { type: String},
  vehicleDetails: {
    owner: String,
    make: String,
    model: String,
    licensePlate: String,
  },
  isAvailable: { type: Boolean, default: true },
});

module.exports = mongoose.model('Driver', driverSchema);