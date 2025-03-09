const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const User = require('../models/User');
const logger = require('../logger');
const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const generateToken = (entity) => {
    const data = {
        user: {
            id: entity.id
        }
    }
    return jwt.sign(data, process.env.JWT_SECRET)
}
// Register (User or Driver)

router.post('/register', async (req, res) => {
    const {
        email,
        password,
        owner,
        role,
        name,
        gender,
        aadhaarNumber,
        mobileNumber,
        licenseNumber,
        vehicleDetails
    } = req.body;
    try {
        if (!['user', 'driver', 'owner'].includes(role)) {
            const msg = 'Invalid role'
            logger.error(msg)
            return res.status(400).json({msg});
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
            if (entity) {
                const msg = `${role} already registered`
                logger.error(msg)
                return res.status(400).json({msg});
            }
            entity = new Model({
                email,
                name,
                password: cryptPassword,
                gender,
                ...(role === 'driver' && {licenseNumber, vehicleDetails, aadhaarNumber, mobileNumber, owner}),
            });
        }
        console.log(entity)
        await entity.save();

        const authToken = await generateToken(entity)
        const msg = `${role} registered`
        logger.info(msg);
        res.json({msg, entity, authToken});
    } catch (err) {
        logger.error(err.message)
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
                const msg = "Owner doesn't exist"
                logger.error(msg)
                return res.status(400).json({msg})
            }
        } else {
            if (!['user', 'driver'].includes(role)) {
                const msg = 'Invalid role'
                logger.error(msg)
                return res.status(400).json({msg});
            }

            const Model = role === 'user' ? User : Driver;
            console.log("model:", Model)
            entity = await Model.findOne({email});
            console.log(entity.password)
            if (!entity) {
                const msg = `${role} not found`
                logger.error(msg);
                return res.status(404).json({msg});
            }
        }
        const comparePass = await bcrypt.compare(password, entity.password);
        console.log(comparePass)
        if (!comparePass) {
            const msg = "Invalid Credentials"
            logger.error(msg)
            return res.status(400).json({msg})
        }
        const authToken = generateToken(entity)
        const msg = `${role} logged in successfully`
        logger.info(msg)
        return res.status(200).json({msg, entity, authToken})

    } catch (err) {
        logger.error(err.message)
        res.status(500).json({msg: 'Server error', error: err.message});
    }
});

module.exports = router;