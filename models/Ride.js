const mongoose = require('mongoose');
// Car field to be added Later
const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  pickupLocation: {
    longitude: {type: String, required: true},
    latitude: {type: String, required: true},
    desc: {type: String, required: true}
  },
  dropoffLocation: {
    longitude: {type: String, required: true},
    latitude: {type: String, required: true},
    desc: {type: String, required: true}
  },
  fare: { type: Number, required: false },
  quote: [{
    driver: {type: mongoose.Schema.Types.ObjectId, ref: 'Driver'},
    price: {type: String, required: true},
    currentLocation: {
      longitude: {type: String},
      latitude: {type: String},
      desc: {type: String}
    },
    duration: {type: String},
    distance: {type: String},
  }],
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled'], default: 'pending' },
  cancelDetails: {
    by: {type: String, enum: ['user', 'driver','system']},
    reason: {type: String}
  },
  otp: {type: Number},
  distance: {type: String},
  duration: {type: String},
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true }); // Adding timestamps for creation/update times

module.exports = mongoose.model('Ride', rideSchema);
