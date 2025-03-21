const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');
const OperationalAdmin = require('../models/OperationalAdmin');
const jwt = require('jsonwebtoken');
const { sendVerificationCode } = require('../services/sms');
const authenticateUser = require('../middlewares/authenticatedUser');

// In-memory OTP store (use Redis or a DB in production)
const otpStore = new Map(); // Key: mobileNumber, Value: { code, expiresAt }

// Generate and store OTP with expiration
const generateAndStoreOtp = (mobileNumber) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
    otpStore.set(mobileNumber, { code, expiresAt });
    return code;
};

// Verify OTP
const verifyOtp = (mobileNumber, code) => {
    const storedOtp = otpStore.get(mobileNumber);
    if (!storedOtp || storedOtp.expiresAt < Date.now()) return false; // OTP expired or not found
    return storedOtp.code === code; // Match OTP
};

// Get model based on role
const getModel = (role) => {
    if (role === 'user') return User;
    if (role === 'driver') return Driver;
    if (role === 'owner') return Owner;
    if (role === 'admin') return Admin;
    if (role === 'operational admin') return OperationalAdmin;
    return null;
};

// Register (User, Owner, Admin, Operational Admin)
router.post('/register', async (req, res) => {
    const { role, name, mobileNumber } = req.body;
    try {
        const Model = getModel(role);
        if (!Model) return res.status(400).json({ msg: 'Invalid role' });

        const existingEntity = await Model.findOne({ mobileNumber });
        if (existingEntity) return res.status(400).json({ msg: `${role} already registered` });

        const entity = new Model({ name, mobileNumber });
        await entity.save();

        const code = generateAndStoreOtp(mobileNumber);
        await sendVerificationCode(mobileNumber, code);

        return res.status(201).json({ msg: `${role} registered successfully. OTP sent to ${mobileNumber}` });
    } catch (err) {
        return res.status(500).json({ msg: 'Error registering', error: err.message });
    }
});

// Login (User, Owner, Admin, Operational Admin)
router.post('/login', async (req, res) => {
    const { role, mobileNumber, otp } = req.body;
    try {
        const Model = getModel(role);
        if (!Model) return res.status(400).json({ msg: 'Invalid role' });

        const entity = await Model.findOne({ mobileNumber });
        if (!entity) return res.status(404).json({ msg: `${role} not found` });

        if (!verifyOtp(mobileNumber, otp)) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const token = jwt.sign({ id: entity._id, role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        otpStore.delete(mobileNumber); // Clean up OTP after successful verification

        return res.status(200).json({ msg: `${role} logged in successfully`, token });
    } catch (err) {
        return res.status(500).json({ msg: 'Error logging in', error: err.message });
    }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
    const { mobileNumber, role } = req.body;
    try {
        const Model = getModel(role);
        if (!Model) return res.status(400).json({ msg: 'Invalid role' });

        const entity = await Model.findOne({ mobileNumber });
        if (!entity) return res.status(404).json({ msg: `${role} not found` });

        const code = generateAndStoreOtp(mobileNumber);
        await sendVerificationCode(mobileNumber, code);

        return res.status(200).json({ msg: 'OTP resent successfully' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error resending OTP', error: err.message });
    }
});

router.post('/addDriver', authenticateUser, async (req, res) => {
    let { mobileNumber, name, role, fcmToken, address, licenseNumber, aadhaarNumber, email } = req.body;
    const { userID } = req
    try {
        mobileNumber = "+91" + mobileNumber
        let entity = await Driver.findOne({ mobileNumber });
        if (entity) return res.status(400).json({ msg: `${role} already registered` });

        if (!licenseNumber || !aadhaarNumber) {
            return res.status(400).json({ msg: 'License number and aadhaar number are required for driver' });
        }

        entity = new Driver({
            mobileNumber,
            name,
            fcmToken,
            owner: userID,
            aadhaarNumber,
            email,
            address,
            licenseNumber
        });

        const code = generateAndStoreOtp(mobileNumber);
        console.log("Generated OTP:", code);
        await sendVerificationCode(mobileNumber, code); // Pass the generated OTP to Twilio
        await entity.save();
        res.json({ msg: 'OTP sent', entity, code });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
}); 

router.post('/loginDriver', authenticateUser, async (req, res) => {
    const { code, mobileNumber } = req.body;
    try {
        const entity = await Driver.findOne({ mobileNumber });
        // console.log(`driverOTPstore: ${driverOtpStore}`)
        if (entity) {
            if (verifyOtp(mobileNumber, code)) {
                entity.isVerified = true;
                await entity.save();
                OtpStore.delete(mobileNumber); // Clean up OTP after successful verification
                res.json({ msg: `driver verified success`, entity });
            } else {
                res.status(400).json({ msg: 'Invalid or expired OTP' });
            }
        }
        // Verify OTP

    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

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
