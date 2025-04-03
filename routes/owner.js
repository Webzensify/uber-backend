const express = require('express');
const router = express.Router();
const Owner = require('../models/Owner');
const Car = require('../models/Car');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const logger = require('../logger')
const authenticateUser = require('../middlewares/authenticatedUser')



router.post('/addCar', authenticateUser, async (req, res) => {
    const { model, brand, type, seats, number, year, desc, acStatus } = req.body
    let msg
    try {
        const owner = req.userID
        if (!model || !brand || !type || !seats || !number || !year || !desc || !acStatus) {
            return res.status(500).json({ msg: "model, brand, type, year, desc, number and seats required to add car" })
        }
        const car = new Car({
            model, brand, type, seats, number, owner, year, desc, acStatus
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

router.get('/getCars', authenticateUser, async (req, res) => {
    let msg;
    const userID = req.userID;
    try {
        const cars = await Car.find({ owner: userID });
        // Find drivers engaged with a car under this owner
        const engagedDrivers = await Driver.find({ owner: userID, vehicleDetails: { $ne: null } })
            .select('name mobileNumber email licenseNumber aadhaarNumber vehicleDetails');
        // Attach driver details to the corresponding car as "engagement"
        const carsWithEngagement = cars.map(car => {
            const driver = engagedDrivers.find(d => d.vehicleDetails.toString() === car._id.toString());
            return { ...car.toObject(), engagement: driver || null };
        });
        msg = "all cars fetched";
        return res.status(200).json({ msg, cars: carsWithEngagement });
    } catch (err) {
        console.log(err);
        msg = "Error fetching cars";
        return res.status(500).json({ msg, err });
    }
})

router.put('/editCar/:carID', authenticateUser, async (req, res) => {
    const { carID } = req.params;
    const { model, brand, type, seats, number, desc, year } = req.body; // Include all fields
    let msg;
    try {
        const car = await Car.findById(carID); // Correct method name
        if (!car) {
            return res.status(404).json({ msg: "Car not found" }); // Handle car not found
        }
        if (car.owner.toString() !== req.userID) {
            return res.status(403).json({ msg: "You are not authorized to edit this car" }); // Proper status code
        }

        // Update fields if provided
        car.model = model || car.model;
        car.brand = brand || car.brand;
        car.type = type || car.type;
        car.seats = seats || car.seats;
        car.number = number || car.number;
        car.desc = desc || car.desc; // Include description
        car.year = year || car.year; // Include year

        await car.save();
        msg = `Car ${carID} updated successfully`;
        return res.status(200).json({ msg, car });
    } catch (err) {
        console.error(err);
        msg = "Error updating the car";
        return res.status(500).json({ msg, err });
    }
});

// Update Car's AC Status (Owner only)
router.put('/updateAcStatus/:carID', authenticateUser, async (req, res) => {
    const { carID } = req.params;
    const { acStatus } = req.body; // Expected to be 'on' or 'off'
    try {
        const car = await Car.findById(carID);
        if (!car) {
            return res.status(404).json({ msg: "Car not found" });
        }
        if (car.owner.toString() !== req.userID) {
            return res.status(403).json({ msg: "You are not authorized to update this car" });
        }
        if (!['on', 'off'].includes(acStatus)) {
            return res.status(400).json({ msg: "Invalid acStatus value. Must be 'on' or 'off'" });
        }
        car.acStatus = acStatus;
        await car.save();
        return res.status(200).json({ msg: "Car acStatus updated successfully", car });
    } catch (err) {
        return res.status(500).json({ msg: "Error updating acStatus", error: err.message });
    }
});

router.delete('/deleteCar/:id', authenticateUser, async (req, res) => {
    const { id } = req.params;
    const userID = req.userID;
    try {
        const car = await Car.findById(id);
        if (!car) {
            return res.status(404).json({ msg: "Car not found" });
        }
        if (car.owner.toString() !== userID) {
            return res.status(403).json({ msg: "You are not authorized to delete this car" });
        }
        await Car.findByIdAndDelete(id);
        return res.status(200).json({ msg: "Car deleted successfully" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ msg: "An error occurred while deleting the car", err });
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
    try {
        const drivers = await Driver.find({ owner: req.userID });
        const rides = [];
        for (const driver of drivers) {
            const driverRides = await Ride.find({ driverId: driver._id });
            rides.push(...driverRides);
        }
        return res.status(200).json({ msg: 'All rides fetched successfully', rides });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching rides', error: err.message });
    }
});

// get ongoing ride sockets
router.get('/ongoingRides', authenticateUser, async (req, res) => {
    try {
        const drivers = await Driver.find({ owner: req.userID });
        const ongoingRides = [];
        for (const driver of drivers) {
            const ride = await Ride.findOne({ driverId: driver._id, status: 'accepted' });
            if (ride) ongoingRides.push(ride);
        }
        return res.status(200).json({ msg: 'Ongoing rides fetched successfully', ongoingRides });
    } catch (err) {
        return res.status(500).json({ msg: 'Error fetching ongoing rides', error: err.message });
    }
});

// Block a driver
router.put('/blockDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        const driver = await Driver.findById(driverId);
        console.log(driver, req.userID, driver.owner)
        if (!driver || driver.owner.toString() !== req.userID) {
            return res.status(404).json({ msg: 'Driver not found or unauthorized' });
        }
        driver.status = 'blocked';
        await driver.save();
        return res.status(200).json({ msg: 'Driver blocked successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error blocking driver', error: err.message });
    }
});

// Unblock Driver API for Owner
router.put('/unblockDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        const driver = await Driver.findById(driverId);
        if (!driver || driver.owner.toString() !== req.userID) {
            return res.status(404).json({ msg: 'Driver not found or unauthorized' });
        }
        driver.status = 'active';
        await driver.save();
        return res.status(200).json({ msg: 'Driver unblocked successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error unblocking driver', error: err.message });
    }
});

// Edit Driver API for Owner
router.put('/editDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    // Allow editing: name, licenseNumber, aadhaarNumber, email, fcmToken
    const { name, licenseNumber, aadhaarNumber, email, fcmToken } = req.body;
    try {
        const driver = await Driver.findById(driverId);
        if (!driver || driver.owner.toString() !== req.userID) {
            return res.status(404).json({ msg: 'Driver not found or unauthorized' });
        }
        if (name) driver.name = name;
        if (licenseNumber) driver.licenseNumber = licenseNumber;
        if (aadhaarNumber) driver.aadhaarNumber = aadhaarNumber;
        if (email) driver.email = email;
        if (fcmToken) driver.fcmToken = fcmToken;
        await driver.save();
        return res.status(200).json({ msg: 'Driver profile updated successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error updating driver profile', error: err.message });
    }
});

// Delete a driver
router.delete('/deleteDriver/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        const driver = await Driver.findById(driverId);
        if (!driver || driver.owner.toString() !== req.userID) {
            return res.status(404).json({ msg: 'Driver not found or unauthorized' });
        }
        await Driver.findByIdAndDelete(driverId);
        return res.status(200).json({ msg: 'Driver deleted successfully' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error deleting driver', error: err.message });
    }
});

// Get Owner Profile
router.get('/profile', authenticateUser, async (req, res) => {
    try {
        const owner = await Owner.findById(req.userID).select('-__v');
        if (!owner) {
            return res.status(404).json({ msg: "Owner not found" });
        }
        return res.status(200).json({ msg: "Owner profile fetched successfully", owner });
    } catch (err) {
        return res.status(500).json({ msg: "Error fetching owner profile", error: err.message });
    }
});

// Edit Owner Profile
router.put('/profile', authenticateUser, async (req, res) => {
    const { name, address, fcmToken, mobileNumber, aadhaarNumber, email } = req.body;
    try {
        const owner = await Owner.findById(req.userID);
        if (!owner) {
            return res.status(404).json({ msg: "Owner not found" });
        }
        // Update only provided fields
        if (name) owner.name = name;
        if (address) owner.address = address;
        if (fcmToken) owner.fcmToken = fcmToken;
        if (mobileNumber) owner.mobileNumber = mobileNumber;
        if (aadhaarNumber) owner.aadhaarNumber = aadhaarNumber;
        if (email) owner.email = email;
        await owner.save();
        return res.status(200).json({ msg: "Owner profile updated successfully", owner });
    } catch (err) {
        return res.status(500).json({ msg: "Error updating owner profile", error: err.message });
    }
});


// Delete owner account
router.delete('/deleteAccount', authenticateUser, async (req, res) => {
    try {
        const ownerId = req.userID;
        await Driver.deleteMany({ owner: ownerId });
        await Car.deleteMany({ owner: ownerId });
        await Owner.findByIdAndDelete(ownerId);
        return res.status(200).json({ msg: 'Owner account deleted successfully' });
    } catch (err) {
        return res.status(500).json({ msg: 'Error deleting account', error: err.message });
    }
});

module.exports = router;