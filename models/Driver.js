const mongoose = require('mongoose');
const driverSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Owner',
    required: true
   },
  mobileNumber: { type: String, required: true, unique: true },
  isVerified: { type: Boolean, default: false },
  status: {type: String, enums: ['active', 'blocked'], default: "active"},
  name: { type: String },
  licenseNumber: { type: String, required: true},
  aadhaarNumber: { type: String, required: true},
  fcmToken: {type: String},
  vehicleDetails: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Car'
  },
  address: {
    type: String,
    required: true
  },
  currentLocation: {
    coordinates: {type: String},
    desc: {type: String}
  },
  isAvailable: { type: Boolean, default: false },
  email: {type: String}
});

module.exports = mongoose.model('Driver', driverSchema);