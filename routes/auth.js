const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner')
const User = require('../models/User');
const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
// Register (User or Driver)
const generateToken = (entity) => {
    const data = {
        user: {
            id: entity.id
        }
    }
    return jwt.sign(data, process.env.JWT_SECRET)
}

router.post('/register', async (req, res) => {
    const {email, password, owner, role, name, gender, aadhaarNumber, mobileNumber, licenseNumber, vehicleDetails} = req.body;
    try {
        if (!['user', 'driver', 'owner'].includes(role)) {
            return res.status(400).json({msg: 'Invalid role'});
        }
        let entity
        const cryptPassword = await bcrypt.hash(password, 10)
        if (role === "owner") {
            entity = await Owner.findOne({email});
            if (entity) return res.status(400).json({msg: `${role} already registered`})
            entity = new Owner({
                email: email,
                name,
                password: cryptPassword,
            })
        } else {
            const Model = role === 'user' ? User : Driver;
            entity = await Model.findOne({email});
            if (entity) return res.status(400).json({msg: `${role} already registered`});
            entity = new Model({
                email,
                name,
                password: cryptPassword ,
                gender,
                ...(role === 'driver' && {licenseNumber, vehicleDetails, aadhaarNumber, mobileNumber, owner }),
            });
        }
        console.log(entity)
        await entity.save();

        const authToken = await generateToken(entity)
        res.json({msg: `${role} registered`, entityId: entity._id, authToken});
    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

// Login (Verify OTP)
router.post('/login', async (req, res) => {
    const {email, password, role} = req.body;
    try {
        let entity;
        if (role === "owner") {
            entity = Owner.findOne({email})
            if (!entity) {
                return res.status(400).json({msg: "Owner doesn't exist"})
            }
        } else {
            if (!['user', 'driver'].includes(role)) {
                return res.status(400).json({msg: 'Invalid role'});
            }

            const Model = role === 'user' ? User : Driver;
            console.log("model:", Model)
            entity = await Model.findOne({email});
            console.log(entity.password)
            if (!entity) {
                return res.status(404).json({msg: `${role} not found, OTP sent for registration`});
            }
        }
        const comparePass = await bcrypt.compare(password, entity.password);
        console.log(comparePass)
        if (!comparePass) {
            return res.status(400).json({msg: "Invalid Credentials"})
        }
        const authToken = generateToken(entity)
        return res.status(200).json({msg: `${role} logged in successfully`})

    } catch (err) {
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

module.exports = router;