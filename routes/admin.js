const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const OperationalAdmin = require('../models/OperationalAdmin');
const authenticateUser = require('../middlewares/authenticatedUser');

// Get all rides (Admin and Operational Admin)
router.get('/allRides', authenticateUser, async (req, res) => {
    try {
        if (!['admin', 'operational admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const rides = await Ride.find().populate('driverId userId', 'name mobileNumber');
        return res.status(200).json({ msg: 'All rides fetched successfully', rides });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching rides', error: err.message });
    }
});

// Get all drivers (Admin and Operational Admin)
router.get('/allDrivers', authenticateUser, async (req, res) => {
    try {
        if (!['admin', 'operational admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const drivers = await Driver.find().populate('owner', 'name email');
        return res.status(200).json({ msg: 'All drivers fetched successfully', drivers });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching drivers', error: err.message });
    }
});

// Block a driver (Admin and Operational Admin)
router.put('/blockDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        if (!['admin', 'operational admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        driver.status = 'blocked';
        await driver.save();
        return res.status(200).json({ msg: 'Driver blocked successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error blocking driver', error: err.message });
    }
});

// Delete a driver (Admin and Operational Admin)
router.delete('/deleteDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        if (!['admin', 'operational admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        await Driver.findByIdAndDelete(driverId);
        return res.status(200).json({ msg: 'Driver deleted successfully' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error deleting driver', error: err.message });
    }
});

// Check all operations (Admin and Operational Admin)
router.get('/allOperations', authenticateUser, async (req, res) => {
    try {
        if (!['admin', 'operational admin'].includes(req.user.role)) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        const owners = await Owner.find().select('name email mobileNumber');
        const drivers = await Driver.find().select('name email mobileNumber');
        const rides = await Ride.find().select('pickupLocation dropoffLocation status');
        return res.status(200).json({ msg: 'All operations fetched successfully', data: { owners, drivers, rides } });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching operations', error: err.message });
    }
});
module.exports = router;

