const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const logger = require('../logger');
const authenticateUser = require('../middlewares/authenticatedUser');
const { sendNotification } = require('../services/notification');
const { Client } = require('@googlemaps/google-maps-services-js');
const client = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY; // Ensure this is set in your environment variables

// Utility function to calculate distance and duration using Google Maps API
async function calculateDistanceAndDuration(origin, destination) {
    try {
        const response = await client.distancematrix({
            params: {
                origins: [`${origin.latitude},${origin.longitude}`],
                destinations: [`${destination.latitude},${destination.longitude}`],
                key: GOOGLE_MAPS_API_KEY,
            },
        });
        console.log(response.data);
        console.log(response.data.rows);
        console.log(response.data.rows[0].elements);
        console.log(response.data.rows[0].elements[0]);
        const element = response.data.rows[0].elements[0];
        const distance = element.distance.value; // Distance in meters
        const duration = element.duration.value; // Duration in seconds

        console.log(`Distance: ${distance} meters, Duration: ${duration} seconds`);
        return { distance, duration };
    } catch (err) {
        throw new Error(`Error calculating distance and duration: ${err.message}`);
    }
}

// get owner fleet 
// complete ride
// cancel ride
// set driver status
// set current car
// user book, user accept
// driver quote, driver see all available jobs

// Add a Ride (User specifies destination)
router.post('/add', authenticateUser, async (req, res) => {
    const { pickupLocation, dropoffLocation } = req.body;
    const userId = req.userID
    try {
        logger.info(`Add ride request received from user ID ${userId}`);
        const user = await User.findById(userId);
        if (!user) {
            const msg = `User with ID ${userId} not found`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }

        // Calculate distance and duration between pickup and dropoff locations
        const { distance, duration } = await calculateDistanceAndDuration(pickupLocation, dropoffLocation);

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
            distance, // Store distance in meters
            duration, // Store duration in seconds
        });
        await ride.save();

        // Notify all available drivers
        const drivers = await Driver.find({ isAvailable: true });
        for (const driver of drivers) {
            await sendNotification(
                driver.fcmToken,
                'New Ride Request',
                `Pickup: ${pickupLocation.desc}, Dropoff: ${dropoffLocation.desc}`
            );
        }

        // Set a timeout to cancel the ride if not accepted within 5 minutes
        // setTimeout(async () => {
        //     const updatedRide = await Ride.findById(ride._id);
        //     if (updatedRide && updatedRide.status === 'pending') {
        //         updatedRide.status = 'cancelled';
        //         updatedRide.cancelDetails = { by: 'system', reason: 'Not accepted within 5 minutes' };
        //         await updatedRide.save();
        //         logger.info(`Ride ID ${ride._id} automatically cancelled after 5 minutes`);
        //     }
        // }, 5 * 60 * 1000); // 5 minutes in milliseconds

        const msg = `Ride added successfully with ID ${ride._id}, notifying available drivers`;
        logger.info(msg);
        return res.json({ msg, rideId: ride._id, distance, duration });
    } catch (err) {
        const msg = 'Error adding ride';
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Driver adds a quote to the Ride
router.post('/quote', authenticateUser, async (req, res) => {
    const { rideId, fare, currentLocation, pickupLocation } = req.body;
    const driverId = req.userID
    try {
        logger.info(`Driver ID ${driverId} adding quote for ride ID ${rideId}`);
        const ride = await Ride.findById(rideId);
        if (!ride || ride.status !== 'pending') {
            const msg = `Invalid ride ID ${rideId} or ride not in pending status`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }
        const driver = await Driver.findById(driverId);
        if (!driver) {
            const msg = `Driver with ID ${driverId} not verified`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }

        // Calculate distance and duration between driver and pickup location
        const { distance, duration } = await calculateDistanceAndDuration(currentLocation, pickupLocation);

        const driverQuote = {
            driver: driverId,
            price: fare,
            currentLocation: {
                longitude: currentLocation.longitude,
                latitude: currentLocation.latitude,
                desc: currentLocation.desc
            },
            distance, // Distance to pickup location
            duration, // Duration to pickup location
        };

        ride.quote.push(driverQuote);
        await ride.save();


        const user = await User.findById(ride.userId);
        await sendNotification(
            user.fcmToken,
            'Quote added',
            `Driver ${driver.name} has added a quote to your ride. Please review the quote.`
        );
        const msg = `Quote added successfully by driver ID ${driverId} for ride ID ${rideId}`;
        logger.info(msg);
        return res.json({ msg, rideId: ride._id });
    } catch (err) {
        const msg = `Error adding quote for ride ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

router.post('/book', authenticateUser, async (req, res) => {
    const { fare, driverId, rideId } = req.body;
    try {
        logger.info(`Booking ride ID ${rideId} with driver ID ${driverId}`);
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = `Ride with ID ${rideId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }
        ride.driverId = driverId;
        ride.fare = fare;
        ride.status = 'accepted';
        ride.otp = Math.floor(100000 + Math.random() * 900000);
        await ride.save();
        const msg = `Ride with ID ${rideId} booked successfully. Proceed to make the payment.`;
        logger.info(msg);
        return res.status(200).json({
            msg,
            rideId: ride._id,
            action: 'join_websocket_room'
        });
    } catch (err) {
        const msg = `Error booking ride with ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Get All Pending Rides
router.post('/pending', authenticateUser, async (req, res) => {
    const driverId = req.userID;
    const { currentLocation } = req.body
    try {
        const testOrigin = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco
        const testDestination = { latitude: 34.0522, longitude: -118.2437 };
        const { distance, duration } = await calculateDistanceAndDuration(testOrigin, testDestination);
        console.log('here')
        logger.info(`Fetching all pending rides for driver ID ${driverId}`);
        const driver = await Driver.findById(driverId);
        if (!driver) {
            const msg = `Driver with ID ${driverId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }

        const pendingRides = await Ride.find({ status: 'pending' })
            .populate('userId', 'name mobileNumber') // Populate user details
            .select('-__v'); // Exclude version field

        const filteredRides = [];
        for (const ride of pendingRides) {
            const { distance, duration } = await calculateDistanceAndDuration(currentLocation, ride.pickupLocation);
            if (distance <= 2000) { // 2 km in meters
                filteredRides.push({ ...ride.toObject(), distance, duration });
            }
        }

        const msg = 'Pending rides retrieved successfully';
        logger.info(msg);
        return res.json({ msg, rides: filteredRides });
    } catch (err) {
        const msg = 'Error retrieving pending rides';
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Get quotes of a ride
router.get('/quotes/:rideId', authenticateUser, async (req, res) => {
    try {
        const { rideId } = req.params;
        logger.info(`Fetching quotes for ride ID ${rideId}`);
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = `Ride with ID ${rideId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }
        const msg = `Quotes retrieved successfully for ride ID ${rideId}`;
        logger.info(msg);
        return res.json({ msg, quotes: ride.quote, status: ride.status });
    } catch (err) {
        const msg = `Error retrieving quotes for ride ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Get Ride Details by Ride ID
router.get('/:rideId', authenticateUser, async (req, res) => {
    try {
        const { rideId } = req.params;
        logger.info(`Fetching details for ride ID ${rideId}`);
        const ride = await Ride.findById(rideId)
            .populate('userId', 'name mobileNumber') // Populate user details
            .populate({
                path: 'driverId',
                select: 'owner mobileNumber isVerified name licenseNumber aadhaarNumber vehicleDetails isAvailable email'
            }); // Populate full driver details
        if (!ride) {
            const msg = `Ride with ID ${rideId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }
        const msg = `Ride details retrieved successfully for ride ID ${rideId}`;
        logger.info(msg);
        return res.json({ msg, ride });
    } catch (err) {
        const msg = `Error retrieving ride details for ride ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Cancel ride
router.post('/cancel', authenticateUser, async (req, res) => {
    const { rideId, reason, driverLocation, userLocation } = req.body; // added driverLocation and userLocation
    try {
        logger.info(`Cancelling ride ID ${rideId} with reason: ${reason}`);
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = `Ride with ID ${rideId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }
        ride.status = 'cancelled';
        ride.cancelDetails = {
            by: req.user.role,
            reason: reason
        };
        await ride.save();
        const msg = `Ride with ID ${rideId} cancelled successfully`;
        logger.info(msg);
        return res.status(200).json({ msg, reason, ride });
    } catch (err) {
        const msg = `Error cancelling ride with ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Verify OTP
router.post('/verifyOtp', authenticateUser, async (req, res) => {
    const { otp, rideId } = req.body;
    try {
        logger.info(`Verifying OTP for ride ID ${rideId}`);
        const ride = await Ride.findById(rideId);
        if (!ride) {
            const msg = `Ride with ID ${rideId} not found`;
            logger.error(msg);
            return res.status(404).json({ msg });
        }
        if (parseInt(otp) === ride.otp) {
            ride.status = 'completed';
            await ride.save();
            const msg = `OTP verified successfully for ride ID ${rideId}. Ride marked as completed.`;
            logger.info(msg);
            return res.status(200).json({ msg, ride });
        } else {
            const msg = `Incorrect OTP for ride ID ${rideId}`;
            logger.error(msg);
            return res.status(400).json({ msg, ride });
        }
    } catch (err) {
        const msg = `Error verifying OTP for ride ID ${rideId}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

module.exports = router;
