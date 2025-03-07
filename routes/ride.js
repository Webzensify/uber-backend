const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const authenticateUser = require('../middlewares/authenticatedUser')
const {sendNotification} = require('../services/notification');
// user book, user accept
// driver quote, driver see all available jobs

// Add a Ride (User specifies destination)
router.post('/add', authenticateUser, async (req, res) => {
    const {userId, pickupLocation, dropoffLocation} = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({msg: 'User not verified'});

        const ride = new Ride({
            userId,
            pickupLocation,
            dropoffLocation,
        });
        await ride.save();

        // Notify all available drivers
        const drivers = await Driver.find({isAvailable: true});
        for (const driver of drivers) {
            await sendNotification(
                driver.fcmToken,
                'New Ride Request',
                `Pickup: ${pickupLocation}, Dropoff: ${dropoffLocation}`
            );
        }
        res.json({msg: 'Ride added, notifying drivers', rideId: ride._id});
    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Driver adds a quote to the Ride
router.post('/quote',authenticateUser , async (req, res) => {
    const {rideId, driverId, fare} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        console.log(ride, driverId)
        if (!ride || ride.status !== 'pending') return res.status(400).json({msg: 'Invalid ride'});

        const driver = await Driver.findById(driverId);
        console.log(driver)
        if (!driver) return res.status(400).json({msg: 'Driver not verified'});
        const driverQuote = {
            driver: driverId,
            price: fare
        }
        console.log(driverQuote)
        ride.quote.push(driverQuote)
        await ride.save();
        console.log(ride.quote)

        const user = await User.findById(ride.userId);
        // await sendNotification(
        //     user.fcmToken,
        //     'Quote added',
        //     `Driver ${driver.name} has added a quote to your ride. Please review the quote.`
        // );
        res.json({msg: 'Quote added, user notified', rideId: ride._id});
    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});


router.post('/book',authenticateUser ,async (req, res) => {
    const {fare, driverId, rideId} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(500).json({msg: 'Internal Server Error, Ride not found'})
        ride.driverId = driverId;
        ride.fare = fare;
        ride.status = 'accepted'
        await ride.save();
        return res.status(200).json({
            msg: `ride ${rideId} booked  now proceed to make the payments`,
            rideId: ride._id,
            action: 'join_websocket_room'
        })
    } catch (err) {
        console.log(err)
    }

})

// Get All Pending Rides
router.get('/pending',authenticateUser , async (req, res) => {
    try {
        const pendingRides = await Ride.find({status: 'pending'})
            .populate('userId', 'name mobileNumber') // Populate user details
            .select('-__v'); // Exclude version field
        res.json({msg: 'Pending rides retrieved', rides: pendingRides});
    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Get quotes of a ride
router.get('/quotes/:rideId',authenticateUser , async (req, res) => {
    try {
        const {rideId} = req.params;
        const ride = await Ride.findById(rideId);
        res.json({msg: 'Pending rides retrieved', quotes: ride.quote});
    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

//  cancel ride


module.exports = router;