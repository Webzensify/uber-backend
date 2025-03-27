const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const OperationalAdmin = require('../models/OperationalAdmin');
const Ride = require('../models/Ride');
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

// Appoint a new Operational Admin
router.post('/appointOperationalAdmin', authenticateUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized' });
    }
    const { name, email, mobileNumber } = req.body;
    try {
        const existingAdmin = await OperationalAdmin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ msg: 'Operational Admin already exists' });
        }
        const operationalAdmin = new OperationalAdmin({ name, email, mobileNumber });
        await operationalAdmin.save();
        return res.status(201).json({ msg: 'Operational Admin appointed successfully', operationalAdmin });
    } catch (err) {
        return res.status(500).json({ msg: 'Error appointing Operational Admin', error: err.message });
    }
});

// Get all users
router.get('/allUsers', authenticateUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized' });
    }
    try {
        const users = await User.find().select('name mobileNumber gender');
        return res.status(200).json({ msg: 'All users fetched successfully', users });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching users', error: err.message });
    }
});

// Get user details by ID
router.get('/user/:userId', authenticateUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized' });
    }
    try {
        const user = await User.findById(req.params.userId).select('-__v');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        return res.status(200).json({ msg: 'User details fetched successfully', user });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching user details', error: err.message });
    }
});

// Get driver details by ID
router.get('/driver/:driverId', authenticateUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized' });
    }
    try {
        const driver = await Driver.findById(req.params.driverId).populate('owner', 'name email');
        if (!driver) {
            return res.status(404).json({ msg: 'Driver not found' });
        }
        return res.status(200).json({ msg: 'Driver details fetched successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching driver details', error: err.message });
    }
});

// Get ride details by ID
router.get('/ride/:rideId', authenticateUser, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Unauthorized' });
    }
    try {
        const ride = await Ride.findById(req.params.rideId)
            .populate('userId', 'name mobileNumber')
            .populate('driverId', 'name mobileNumber');
        if (!ride) {
            return res.status(404).json({ msg: 'Ride not found' });
        }
        return res.status(200).json({ msg: 'Ride details fetched successfully', ride });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching ride details', error: err.message });
    }
});

module.exports = router;

