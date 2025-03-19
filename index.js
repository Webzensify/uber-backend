require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const fs = require("fs");
const Driver = require("./models/Driver");
const Ride = require("./models/Ride");
const path = require("path");
const logger = require("./logger");
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const paymentRoutes = require('./routes/payment');
const userRoutes = require('./routes/user'); // New
const driverRoutes = require('./routes/driver'); // New
const ownerRoutes = require('./routes/owner');
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');

// Ensure the logs directory exists
const logDirectory = "logs";
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

app.use(express.json());
app.use(cors())
// Middleware to log all requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
});

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
app.use('/api/owner', ownerRoutes)

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Socket.IO Server
const io = new Server(server, {
  cors: { origin: '*' }, // Allow all origins (adjust for production)
});

io.on('connection', (socket) => {
  console.log('New Socket.IO connection:', socket.id);

  // Handle join event
  socket.on('join', (data) => {
    const { rideId, role, userId, driverId } = data || {};

    if (!rideId) {
      socket.emit('error', { message: 'rideId required' });
      return;
    }

    // Join the rideId room
    socket.join(rideId);
    socket.rideId = rideId; // Store rideId on the socket object
    console.log(`Client ${socket.id} ${role} joined room ${rideId}`);

    // Notify client of successful join
    socket.emit('joined', { rideId });
  });

  // Handle coordinates event
  socket.on('coordinates', async(data) => {
    socket.emit('message', {
      msg: "hello"
    })
    const { rideId, currentLocation, driverId } = data || {};
    console.log(rideId, currentLocation, driverId)
    if (!rideId || !currentLocation) {
      socket.emit('error', { message: 'rideId and coordinates required' });
      return;
    }
    const driver = await Driver.findById(driverId);
    console.log(driver)
    driver.currentLocation = currentLocation;
    await driver.save()
    // Broadcast coordinates to other clients in the room
    socket.to(rideId).emit('driverUpdated', {
      msg: "hello",
      rideId,
      driverId,
      currentLocation
    });
    console.log(`driver current location updated `);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.rideId) {
      console.log(`Client ${socket.id} left room ${socket.rideId}`);
      // Socket.IO automatically removes the socket from rooms on disconnect
    }
  });
});