const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const User = require('../models/User');
const logger = require('../logger');
const Driver = require('../models/Driver');
const jwt = require('jsonwebtoken');
const { sendVerificationCode } = require('../services/sms');


const generateToken = (entity) => {
    const data = {
        user: {
            id: entity.id
        }
    }
    return jwt.sign(data, process.env.JWT_SECRET);
}

 
 // In-memory OTP store (use Redis or a DB in production)
 const otpStore = new Map(); // Key: mobileNumber, Value: { code, expiresAt }
 
 // Generate and store OTP with expiration
 const generateAndStoreOtp = (mobileNumber) => {
   const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
   const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
   otpStore.set(mobileNumber, { code, expiresAt });
   return code;
 };
 
 const getModel = (role) => {
    if (role === "user"){
        Model = User;
     }
     else if(role === "driver"){
        Model = Driver;
    }
    else{
        Model = Owner;
    }
    return Model
 }

 // Verify OTP
 const verifyOtp = (mobileNumber, code) => {
   const storedOtp = otpStore.get(mobileNumber);
   console.log("Stored OTP:", storedOtp);
   if (!storedOtp) return false; // No OTP found
  
   return storedOtp.code === code; // Match OTP
 };
 
 // Register (User or Driver)
 router.post('/register', async (req, res) => {
   const { mobileNumber, name, role, fcmToken, address, aadhaarNumber, email } = req.body;
   console.log(role, aadhaarNumber, address, email)
   try {
     if (!['user', 'owner'].includes(role)) {
       return res.status(400).json({ msg: 'Invalid role' });
     }
     let Model = getModel(role)
     let entity = await Model.findOne({ mobileNumber });
     if (entity) return res.status(400).json({ msg: `${role} already registered` });

     
     else if (role === 'owner' && (!aadhaarNumber || !address || !email)) {
        return res.status(500).json({ msg: 'Aadhaar number, address and email details required for owner' });
      }
 
     entity = new Model({ 
       mobileNumber,
       name,
       fcmToken,
       ...(role === 'owner' && { aadhaarNumber, email, address }),
     });
     await entity.save();
     const code = generateAndStoreOtp(mobileNumber);
     console.log("Generated OTP:", code);
    //  await sendVerificationCode(mobileNumber, code); // Pass the generated OTP to Twilio
     
     res.json({ msg: 'OTP sent', entity, code });
   } catch (err) {
     res.status(500).json({ msg: 'Server error', error: err.message });
   }
 });
 
 // Login (Verify OTP)
 router.post('/login', async (req, res) => {
   const { mobileNumber, role, code } = req.body;
   try {
     if (!['user', 'driver', 'owner'].includes(role)) {
       return res.status(400).json({ msg: 'Invalid role' });
     }
     let Model = getModel(role)
     const entity = await Model.findOne({ mobileNumber });
     if (!entity || !code) {
        
       // If user/driver doesn’t exist, treat it as a registration trigger
       const code = generateAndStoreOtp(mobileNumber);
       console.log(code)
      //  await sendVerificationCode(mobileNumber, code);
       return res.status(404).json({ msg: `OTP ${code} sent for registration` });
     }
 
     // Verify OTP
     if (verifyOtp(mobileNumber, code)) {
       entity.isVerified = true;
       await entity.save();
       const authToken = generateToken(entity) 
       otpStore.delete(mobileNumber); // Clean up OTP after successful verification
       res.json({ msg: `${role} logged in`, entity, authToken });
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
 
     const Model = getModel(role);
     const entity = await Model.findOne({ mobileNumber });
     if (!entity) return res.status(404).json({ msg: `${role} not found` });
 
     const code = generateAndStoreOtp(mobileNumber);
     await sendVerificationCode(mobileNumber, code);
     res.json({ msg: 'OTP resent' });
   } catch (err) {
     res.status(500).json({ msg: 'Server error', error: err.message });
   }
 });
 
module.exports = router, generateAndStoreOtp, verifyOtp;
