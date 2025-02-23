const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ride = require('../models/Ride');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order (After Driver Accepts)
router.post('/create-order', async (req, res) => {
  const { rideId } = req.body;
  try {
    const ride = await Ride.findById(rideId).populate('userId');
    if (!ride || ride.status !== 'accepted') {
      return res.status(400).json({ msg: 'Ride not accepted yet' });
    }
    if (ride.paymentStatus === 'paid') {
      return res.status(400).json({ msg: 'Ride already paid' });
    }

    const options = {
      amount: ride.fare * 100, // Fare in paise
      currency: 'INR',
      receipt: `ride_${rideId}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      msg: 'Order created successfully',
      orderId: order.id,
      amount: options.amount,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Verify Payment
router.post('/verify', async (req, res) => {
  const { rideId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  try {
    const ride = await Ride.findById(rideId);
    if (!ride || ride.paymentStatus === 'paid') {
      return res.status(400).json({ msg: 'Invalid ride or already paid' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ msg: 'Invalid payment signature' });
    }

    ride.paymentStatus = 'paid';
    ride.status = 'completed';
    await ride.save();

    res.json({ msg: 'Payment verified and ride completed' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;