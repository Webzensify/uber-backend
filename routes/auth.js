const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const { sendVerificationCode } = require('../services/sms');

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
  console.log("Stored OTP:", storedOtp);
  if (!storedOtp) return false; // No OTP found
  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(mobileNumber); // Clean up expired OTP
    return false; // OTP expired
  }
  return storedOtp.code === code; // Match OTP
};

// Register (User or Driver)
router.post('/register', async (req, res) => {
  const { mobileNumber, name, role, fcmToken, licenseNumber, vehicleDetails, gender } = req.body;
  try {
    if (!['user', 'driver'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const Model = role === 'user' ? User : Driver;
    let entity = await Model.findOne({ mobileNumber });
    if (entity) return res.status(400).json({ msg: `${role} already registered` });

    if (role === 'driver' && (!licenseNumber || !vehicleDetails)) {
      return res.status(400).json({ msg: 'License number and vehicle details required for driver' });
    }

    entity = new Model({
      mobileNumber,
      name,
      fcmToken,
      gender,
      ...(role === 'driver' && { licenseNumber, vehicleDetails }),
    });

    const code = generateAndStoreOtp(mobileNumber);
    console.log("Generated OTP:", code);
    await sendVerificationCode(mobileNumber, code); // Pass the generated OTP to Twilio
    await entity.save();
    res.json({ msg: 'OTP sent', entityId: entity._id });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Login (Verify OTP)
router.post('/login', async (req, res) => {
  const { mobileNumber, role, code } = req.body;
  try {
    if (!['user', 'driver'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const Model = role === 'user' ? User : Driver;
    const entity = await Model.findOne({ mobileNumber });
    if (!entity) {
      // If user/driver doesn’t exist, treat it as a registration trigger
      const code = generateAndStoreOtp(mobileNumber);
      await sendVerificationCode(mobileNumber, code);
      return res.status(404).json({ msg: `${role} not found, OTP sent for registration` });
    }

    // Verify OTP
    if (verifyOtp(mobileNumber, code)) {
      entity.isVerified = true;
      await entity.save();
      otpStore.delete(mobileNumber); // Clean up OTP after successful verification
      res.json({ msg: `${role} logged in`, entityId: entity._id });
    } else {
      res.status(400).json({ msg: 'Invalid or expired OTP' });
    }
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Optional: Resend OTP
router.post('/resend-otp', async (req, res) => {
  const { mobileNumber, role } = req.body;
  try {
    if (!['user', 'driver'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const Model = role === 'user' ? User : Driver;
    const entity = await Model.findOne({ mobileNumber });
    if (!entity) return res.status(404).json({ msg: `${role} not found` });

    const code = generateAndStoreOtp(mobileNumber);
    await sendVerificationCode(mobileNumber, code);
    res.json({ msg: 'OTP resent' });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;