const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Car = require('../models/Car');
const logger = require('../logger')
const authenticateUser = require('../middlewares/authenticatedUser')
// Get Driver Profile
router.get('/profile/:driverId', async (req, res) => {
  try {
    // console.log(req)
    const driver = await Driver.findById(req.params.driverId).select('-__v');
    if (!driver) {
      const msg =  'Driver not found';
      logger.error(msg);
      return res.status(404).json({msg});
    }
    logger.info("Driver info fetched")
    return res.status(200).json(driver);
  } catch (err) {
    logger.error(err.message)
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update Driver Profile
router.put('/profile/:driverId', authenticateUser, async (req, res) => {
  const { name, licenseNumber, aadhaarNumber, vehicleDetails, isAvailable } = req.body;
  try {
    const driver = await Driver.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ msg: 'Driver not found' });

    driver.name = name || driver.name;
    driver.licenseNumber = licenseNumber || driver.licenseNumber;
    driver.aadhaarNumber = aadhaarNumber || driver.aadhaarNumber;
    if (vehicleDetails) {
      driver.vehicleDetails = {
        owner: vehicleDetails.owner || driver.vehicleDetails.owner,
        make: vehicleDetails.make || driver.vehicleDetails.make,
        model: vehicleDetails.model || driver.vehicleDetails.model,
        licensePlate: vehicleDetails.licensePlate || driver.vehicleDetails.licensePlate,
      };
    }
    driver.isAvailable = isAvailable !== undefined ? isAvailable : driver.isAvailable;

    await driver.save();
    const msg = 'Profile updated'
    logger.info(msg);
    return res.json({ msg, driver });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Select fleet for driver
router.put('/selectFleet/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    const { carId } = req.body;
    try {
        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        const car = await Car.findById(carId);
        if (!car || car.owner.toString() !== driver.owner.toString()) {
            return res.status(404).json({ msg: 'Car not found or unauthorized' });
        }

        // Check if any other driver for the same owner has already selected this car
        const existingDriver = await Driver.findOne({ vehicleDetails: carId, owner: driver.owner });
        if (existingDriver && existingDriver._id.toString() !== driverId) {
            return res.status(400).json({ msg: 'This fleet is already assigned to another driver' });
        }

        driver.vehicleDetails = car._id;
        await driver.save();
        return res.status(200).json({ msg: 'Fleet selected successfully', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error selecting fleet', error: err.message });
    }
});

// Get available cars in the fleet for selection
router.get('/availableFleet/:ownerId', authenticateUser, async (req, res) => {
    const { ownerId } = req.params;
    try {
        // Find cars that are not assigned to any driver
        const availableCars = await Car.find({
            owner: ownerId,
            _id: { $nin: (await Driver.find({ owner: ownerId }).distinct('vehicleDetails')) }
        });

        if (!availableCars || availableCars.length === 0) {
            const msg = 'No available cars in the fleet';
            logger.info(msg);
            return res.status(404).json({ msg });
        }

        const msg = 'Available cars fetched successfully';
        logger.info(msg);
        return res.status(200).json({ msg, availableCars });
    } catch (err) {
        const msg = 'Error fetching available cars';
        logger.error(`${msg}: ${err.message}`);
        return res.status(500).json({ msg, error: err.message });
    }
});

// Toggle driver availability
router.put('/toggleAvailability/:driverId', authenticateUser, async (req, res) => {
    const { driverId } = req.params;
    try {
        const driver = await Driver.findById(driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        driver.isAvailable = !driver.isAvailable;
        await driver.save();
        return res.status(200).json({ msg: 'Driver availability updated', driver });
    } catch (err) {
        return res.status(500).json({ msg: 'Error updating availability', error: err.message });
    }
});

module.exports = router;