require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user'); // New
const driverRoutes = require('./routes/driver'); // New

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/ride', rideRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/user', userRoutes); // New
app.use('/api/driver', driverRoutes); // New

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});