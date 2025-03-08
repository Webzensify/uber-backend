const express = require('express');
const router = express.Router();
const logger = require('../logger')
const User = require('../models/User');
const authenticateUser = require('../middlewares/authenticatedUser')

// Get User Profile
router.get('/profile/:userId',authenticateUser , async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    if (!user){
      const msg = 'User not found'
      logger.error(msg)
      return res.status(404).json({msg});
    }
    const msg = 'user profile fetched'
    logger.info(msg)
    return res.json({msg, user});
  } catch (err) {
    logger.error(err.message)
    return res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update User Profile
router.put('/profile/:userId',authenticateUser , async (req, res) => {
  const { name, gender, fcmToken } = req.body;
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    user.name = name || user.name;
    user.gender = gender || user.gender; // Gender is required, but we allow updates
    user.fcmToken = fcmToken || user.fcmToken;

    await user.save();
    const msg = 'User Profile updated'
    logger.info(msg)
    return res.json({ msg, user });
  } catch (err) {
    logger.error(err.message)
    return res.status(500).json({ msg: 'Server error', error: err.message ,e});
  }
});

module.exports = router;