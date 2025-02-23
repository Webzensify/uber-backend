const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');

// Get Driver Profile
router.get('/profile/:driverId', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId).select('-__v');
    if (!driver) return res.status(404).json({ msg: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update Driver Profile
router.put('/profile/:driverId', async (req, res) => {
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
    res.json({ msg: 'Profile updated', driver });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;