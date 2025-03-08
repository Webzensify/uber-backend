const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
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

module.exports = router;