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
const logger = require('../logger');

// In-memory OTP store (use Redis or a DB in production)
const otpStore = new Map(); // Key: mobileNumber, Value: { code, expiresAt }

// Generate and store OTP with expiration
const generateAndStoreOtp = (mobileNumber) => {
    // const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const code = 210000
    // const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
    otpStore.set(mobileNumber, { code });
    console.log(`set otps: ${otpStore}`)
    return code;
};

// Verify OTP
const verifyOtp = (mobileNumber, code) => {
    console.log(`otps: ${otpStore}`)
    const storedOtp = otpStore.get(mobileNumber);
    console.log(storedOtp.code, code)
    console.log(parseInt(storedOtp.code) === parseInt(code))
    // if (!storedOtp || storedOtp.expiresAt < Date.now()) return false; // OTP expired or not found
    return parseInt(storedOtp.code) === parseInt(code); // Match OTP
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
    const { role, name, mobileNumber, email, otp, aadhaarNumber, address } = req.body;

    try {
        const Model = getModel(role);
        if (!Model) {
            const msg = `Invalid role provided: ${role}`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }

        const existingEntity = await Model.findOne({ mobileNumber });
        if (existingEntity) {
            const msg = `${role} with mobile number ${mobileNumber} already registered`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }

        // Validate OTP
        if (!verifyOtp(mobileNumber, otp)) {
            const msg = `Invalid or expired OTP for mobile number ${mobileNumber}`;
            logger.error(msg);
            return res.status(400).json({ msg });
        }

        // Create a new user
        const entity = new Model({
            name,
            mobileNumber,
            ...(role === 'owner' && { email, aadhaarNumber, address }),
        });
        await entity.save();

        const token = jwt.sign({ id: entity._id }, process.env.JWT_SECRET);
        otpStore.delete(mobileNumber); // Clean up OTP after successful verification

        const msg = `${role} registered successfully with mobile number ${mobileNumber}`;
        logger.info(msg);
        return res.status(201).json({ msg, entity, token });
    } catch (err) {
        const msg = `Error registering ${role} with mobile number ${mobileNumber}`;
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
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

        // Validate OTP
        console.log("checking otp")
        if (!verifyOtp(mobileNumber, otp)) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }    
        console.log("verified otp")
        const token = jwt.sign({ id: entity._id }, process.env.JWT_SECRET);
        
        otpStore.delete(mobileNumber); // Clean up OTP after successful verification
        
        return res.status(200).json({ msg: `${role} logged in successfully`,entity, token });
    } catch (err) {
        return res.status(500).json({ msg: 'Error logging in', error: err.message });
    }
});

// Resend OTP
router.post('/send-otp', async (req, res) => {
    const { mobileNumber, role } = req.body;
    try {
        const Model = getModel(role);
        if (!Model) return res.status(400).json({ msg: 'Invalid role' });

        const code = generateAndStoreOtp(mobileNumber);
        // await sendVerificationCode(mobileNumber, code); // Uncomment to integrate with SMS service

        return res.status(200).json({ msg: `OTP sent to ${mobileNumber}` });
    } catch (err) {
        return res.status(500).json({ msg: 'Error sending OTP', error: err.message });
    }
});


router.post('/addDriver', authenticateUser, async (req, res) => {
    const { mobileNumber, name, role, fcmToken, address, licenseNumber, aadhaarNumber, email } = req.body;
    const { userID } = req
    try {
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
        // await sendVerificationCode(mobileNumber, code); // Pass the generated OTP to Twilio
        await entity.save();
        res.json({ msg: 'OTP sent', entity, code });
    } catch (err) {
        res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

router.post('/loginDriver', authenticateUser, async (req, res) => {
    const { otp, mobileNumber } = req.body;
    try {
        const entity = await Driver.findOne({ mobileNumber });
        // console.log(`driverOTPstore: ${driverOtpStore}`)
        if (entity) {
            if (verifyOtp(mobileNumber, otp)) {
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
module.exports = router;
