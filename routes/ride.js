const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const logger = require('../logger');
const authenticateUser = require('../middlewares/authenticatedUser');
const {sendNotification} = require('../services/notification');

// user book, user accept
// driver quote, driver see all available jobs

// Add a Ride (User specifies destination)
router.post('/add', authenticateUser, async (req, res) => {
    const {userId, pickupLocation, dropoffLocation} = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            const msg = 'User not found';
            logger.error(msg);
            return res.status(400).json({msg});
        }
        const ride = new Ride({
            userId,
            pickupLocation: {
                longitude: pickupLocation.longitude,
                latitude: pickupLocation.latitude,
                desc: pickupLocation.desc
            },
            dropoffLocation: {
                longitude: dropoffLocation.longitude,
                latitude: dropoffLocation.latitude,
                desc: dropoffLocation.desc
            },
        });
        await ride.save();

        // Notify all available drivers
        const drivers = await Driver.find({isAvailable: true});
        for (const driver of drivers) {
            await sendNotification(
                driver.fcmToken,
                'New Ride Request',
                `Pickup: ${pickupLocation.desc}, Dropoff: ${dropoffLocation.desc}`
            );
        }
        const msg = 'Ride added, notifying drivers';
        logger.info(msg);
        return res.json({msg, rideId: ride._id});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Driver adds a quote to the Ride
router.post('/quote', authenticateUser, async (req, res) => {
    const {rideId, driverId, fare, currentLocation} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'pending') {
            const msg = 'Invalid ride';
            logger.error(msg);
            return res.status(400).json({msg});
        }
        const driver = await Driver.findById(driverId);
        if (!driver) {
            const msg = 'Driver not verified';
            logger.error(msg);
            return res.status(400).json({msg});
        }
        const driverQuote = {
            driver: driverId,
            price: fare,
            currentLocation: {
                longitude: currentLocation.longitude,
                latitude: currentLocation.latitude,
                desc: currentLocation.desc
            }
        };
        
        ride.quote.push(driverQuote);
        await ride.save();
        

        const user = await User.findById(ride.userId);
        await sendNotification(
            user.fcmToken,
            'Quote added',
            `Driver ${driver.name} has added a quote to your ride. Please review the quote.`
        );
        const msg = 'Quote added, user notified';
        logger.info(msg);
        return res.json({msg, rideId: ride._id});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

router.post('/book', authenticateUser, async (req, res) => {
    const {fare, driverId, rideId} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = 'Ride not found';
            logger.error(msg);
            return res.status(500).json({msg});
        }
        ride.driverId = driverId;
        ride.fare = fare;
        ride.status = 'accepted';
        ride.otp = Math.floor(100000 + Math.random() * 900000);
        await ride.save();
        const msg = `ride ${rideId} booked now proceed to make the payments`;
        logger.info(msg);
        return res.status(200).json({
            msg,
            rideId: ride._id,
            action: 'join_websocket_room'
        });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Get All Pending Rides
router.get('/pending', authenticateUser, async (req, res) => {
    try {
        const pendingRides = await Ride.find({status: 'pending'})
            .populate('userId', 'name mobileNumber') // Populate user details
            .select('-__v'); // Exclude version field
        const msg = 'Pending rides retrieved';
        // logger.info(msg);
        return res.json({msg, rides: pendingRides});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Get quotes of a ride
router.get('/quotes/:rideId', authenticateUser, async (req, res) => {
    try {
        const {rideId} = req.params;
        const ride = await Ride.findById(rideId);
        const msg = 'ride quotes retrieved';
        logger.info(msg);
        return res.json({msg, quotes: ride.quote});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Get Ride Details by Ride ID
router.get('/:rideId', authenticateUser, async (req, res) => {
    try {
        const {rideId} = req.params;
        const ride = await Ride.findById(rideId)
            .populate('userId', 'name mobileNumber') // Populate user details
            .populate({
                path: 'driverId',
                select: 'owner mobileNumber isVerified name licenseNumber aadhaarNumber vehicleDetails isAvailable email'
            }); // Populate full driver details
        if (!ride) {
            const msg = 'Ride not found';
            logger.error(msg);
            return res.status(404).json({msg});
        }
        const msg = 'Ride details retrieved';
        logger.info(msg);
        return res.json({msg, ride});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Cancel ride
router.post('/cancel', authenticateUser, async (req, res) => {
    const {rideId, reason} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = 'Ride not found';
            logger.error(msg);
            return res.status(500).json({msg: 'Internal Server Error'});
        }
        ride.status = 'cancelled';
        ride.cancelDetails = {
            by: req.user.role,
            reason: reason
        };
        await ride.save();
        const msg = 'Ride cancelled successfully';
        logger.info(msg);
        return res.status(200).json({msg, reason, ride});
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Error occurred while cancelling the ride', err});
    }
});

// Verify OTP
router.post('/verifyOtp', authenticateUser, async (req, res) => {
    const {otp, rideId} = req.body;
    try {
        const ride = await Ride.findById(rideId);
        if (!ride) return res.status(500).json({msg: 'Internal Server Error, Ride not found'});
        if (parseInt(otp) === ride.otp) {
            const msg = 'OTP verified, ride complete';
            ride.status = 'completed';
            ride.save();
            logger.info(msg);
            return res.status(200).json({msg, ride});
        } else {
            const msg = 'Incorrect OTP';
            logger.info(msg);
            return res.status(500).json({msg, ride});
        }
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({msg: 'Internal Server error', error: err.message});
    }
});

module.exports = router;
