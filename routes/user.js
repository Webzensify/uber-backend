const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateUser = require('../middlewares/authenticatedUser')

// Get User Profile
router.get('/profile/:userId',authenticateUser , async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-__v');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
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
    res.json({ msg: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;