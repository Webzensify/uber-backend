const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const Car = require('../models/Car');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const logger = require('../logger')
const authenticateUser = require('../middlewares/authenticatedUser')

// In-memory OTP store (use Redis or a DB in production)
const driverOtpStore = new Map(); // Key: mobileNumber, Value: { code, expiresAt }

const generateAndStoreOtp = (mobileNumber) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    const expiresAt = Date.now() + 5 * 60 * 1000; // Expires in 5 minutes
    driverOtpStore.set(mobileNumber, { code, expiresAt });
    return code;
};

const verifyOtp = (mobileNumber, code) => {
    const storedOtp = driverOtpStore.get(mobileNumber);
    console.log("Stored OTP:", storedOtp);
    if (!storedOtp) return false; // No OTP found

    return storedOtp.code === code; // Match OTP
};

router.post('/addCar', authenticateUser, async (req, res) => {
    const { model, brand, type, seats, number, year, desc } = req.body
    let msg
    try {
        const owner = req.userID
        if (!model || !brand || !type || !seats || !number || !year || !desc) {
            return res.status(500).json({ msg: "model, brand, type, year, desc, number and seats required to add car" })
        }
        const car = new Car({
            model, brand, type, seats, number, owner, year, desc
        })
        await car.save()
        msg = `Car ${car} added to fleet of owner ${owner}`
        return res.status(200).json({ msg, car })
    }
    catch (err) {
        console.log(err)
        msg = "Error adding car"
        return res.status(500).json({ msg, err })
    }
})

router.put('/editCar/:carID', authenticateUser, async (req, res) => {
    const { carID } = req.params
    const { model, brand, type, seats, number } = req.body
    let msg
    try {
        const car = await Car.findByID(carID)
        if (car.owner !== req.userID) {
            msg = "car belongs to someone else"
            return res.status(500).json(msg)
        }
        car.model = model || car.model
        car.brand = brand || car.brand
        car.type = type || car.type
        car.seats = seats || car.seats
        car.number = number || car.number
        await car.save()
        msg = `Car ${carID} updated `
        return res.status(200).json({ msg, car })
    }
    catch (err) {
        console.log(err)
        msg = "Error updating the car "
        return res.status(500).json({ msg, err })
    }
})


router.get('/deleteCar/:id', authenticateUser, async (req, res) => {
    const { id } = req.params
    const userID = req.userID
    let msg
    try {
        const car = await Car.findByID(id)
        if (car.owner !== userID) {
            msg = "car belongs to someone else"
            return res.status(500).json(msg)
        }
        else {
            msg = "car deleted"
            await Car.findByIdAndDelete(id);
        }

        return res.status(200).json({ msg })
    }
    catch (err) {
        console.log(err)
        msg = "Error adding car"
        return res.status(500).json({ msg, err })
    }
})

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
    const { code, mobileNumber } = req.body;
    try {
        const entity = await Driver.findOne({ mobileNumber });
        console.log(`driverOTPstore: ${driverOtpStore}`)
        if (entity) {
            if (verifyOtp(mobileNumber, code)) {
                entity.isVerified = true;
                await entity.save();
                driverOtpStore.delete(mobileNumber); // Clean up OTP after successful verification
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



router.get('/profile/:driverId', authenticateUser, async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        const msg = 'Profile fetched'
        logger.info(msg);
        return res.json({ msg, driver });
    } catch (err) {
        logger.error(err.message);
        return res.status(500).json({ msg: 'Server error', error: err.message });
    }
});

// all drivers 
router.get('/allDrivers', authenticateUser, async (req, res) => {
    const { userID } = req
    let msg;
    let rides = []
    try {
        const drivers = await Driver.find({ owner: userID })
        console.log(`drivers ${drivers}`)

        msg = "all drivers fetched"
        return res.status(200).json({ msg, drivers })
    }
    catch (err) {
        return res.status(500).json({ msg })
    }
})


// all rides
router.get('/allRides', authenticateUser, async (req, res) => {
    const { userID } = req
    let msg;
    let rides = []
    try {
        const drivers = await Driver.find({ owner: userID })
        console.log(`drivers ${drivers}`)
        for (driver in drivers) {
            const id = driver.id
            const driverRides = await Ride.find({ driver: id })
            for (ride in driverRides) {
                console.log(`ride ${ride}`)
                rides.push(ride)
            }
        }
        msg = "all rides fetched"
        return res.status(200).json({ msg, rides })
    }
    catch (err) {
        return res.status(500).json({ msg })
    }
})


router.get('/allCurrentRides', authenticateUser, async (req, res) => {
    const { userID } = req
    let msg;
    let rides = []
    try {
        const drivers = await Driver.find({ owner: userID })
        console.log(`drivers ${drivers}`)
        for (driver in drivers) {
            const id = driver.id
            const driverRide = await Ride.findOne({ driver: id, status: 'accepted' })
            rides.push(driverRide)
        }
        msg = "all current rides fetched"
        return res.status(200).json({ msg, rides })
    }
    catch (err) {
        return res.status(500).json({ msg })
    }
})

module.exports = router;