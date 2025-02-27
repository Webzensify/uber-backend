const mongoose = require('mongoose');
const driverSchema = new mongoose.Schema({
  owner: {type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
  mobileNumber: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  name: { type: String },
  licenseNumber: { type: String, required: true},
  aadhaarNumber: { type: String, required: true},
  vehicleDetails: {
    owner: String,
    make: String,
    model: String,
    licensePlate: String
  },
  isAvailable: { type: Boolean, default: true },
  email: {type: String, required: true},
  password: {type: String, required: true}
});

module.exports = mongoose.model('Driver', driverSchema);