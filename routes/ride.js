const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const { sendNotification } = require('../services/notification');

// Book a Ride (User specifies destination and fare)
router.post('/book', async (req, res) => {
  const { userId, pickupLocation, dropoffLocation, fare } = req.body;
  try {
    const user = await User.findById(userId);
    if (!user || !user.isVerified) return res.status(400).json({ msg: 'User not verified' });

    const ride = new Ride({
      userId,
      pickupLocation,
      dropoffLocation,
      fare,
    });
    await ride.save();

    // Notify all available drivers
    const drivers = await Driver.find({ isAvailable: true });
    for (const driver of drivers) {
      await sendNotification(
        driver.fcmToken,
        'New Ride Request',
        `Pickup: ${pickupLocation}, Dropoff: ${dropoffLocation}, Fare: ₹${fare}`
      );
    }
    res.json({ msg: 'Ride booked, notifying drivers', rideId: ride._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Driver Accepts Ride
router.post('/accept', async (req, res) => {
  const { rideId, driverId } = req.body;
  try {
    const ride = await Ride.findById(rideId);
    console.log(ride, driverId)
    if (!ride || ride.status !== 'pending') return res.status(400).json({ msg: 'Invalid ride' });

    const driver = await Driver.findById(driverId);
    console.log(driver)
    if (!driver || !driver.isVerified) return res.status(400).json({ msg: 'Driver not verified' });

    ride.driverId = driverId;
    ride.status = 'accepted';
    await ride.save();

    // const user = await User.findById(ride.userId);
    // await sendNotification(
    //   user.fcmToken,
    //   'Ride Accepted',
    //   `Driver ${driver.name} has accepted your ride. Please make the payment.`
    // );
    res.json({ msg: 'Ride accepted, user notified', rideId: ride._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Get All Pending Rides
router.get('/pending', async (req, res) => {
  try {
    const pendingRides = await Ride.find({ status: 'pending' })
      .populate('userId', 'name mobileNumber') // Populate user details
      .select('-__v'); // Exclude version field
    res.json({ msg: 'Pending rides retrieved', rides: pendingRides });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;