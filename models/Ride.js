const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  fare: { type: Number, required: false },
  quote: [{
    driver: {type: mongoose.Schema.Types.ObjectId, ref: 'Driver'},
    price: {type: String, required: true}
  }],
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
}, { timestamps: true }); // Adding timestamps for creation/update times

module.exports = mongoose.model('Ride', rideSchema);