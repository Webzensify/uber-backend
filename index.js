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
const userRoutes = require('./routes/user');
const driverRoutes = require('./routes/driver');
const ownerRoutes = require('./routes/owner');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
const http = require('http');
const server = http.createServer(app);

// for production
// // Serve static files from React build
// app.use(express.static(path.join(__dirname, 'client/build')));

// // Handle React routing, return all requests to React app
// app.get('*', function(req, res) {
//   res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
// });

// Ensure the logs directory exists
const logDirectory = "logs";
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
}

app.use(express.json());
app.use(cors({
  origin: "*",  // Change to your Netlify URL for security
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
}));
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
app.use('/api/user', userRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/admin', adminRoutes);
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
  socket.on('coordinates', async (data) => {
    const { rideId, currentLocation, driverId } = data || {};
    if (!rideId || !currentLocation) {
      socket.emit('error', { message: 'rideId and coordinates required' });
      return;
    }
    const ride = await Ride.findById(rideId)
    if (ride.status === 'cancelled'){
      socket.emit('cancelRide')
    }
    
    const driver = await Driver.findById(driverId);
    if (driver) {
      driver.currentLocation = currentLocation;
      await driver.save();
      // Broadcast coordinates to other clients in the room
      socket.to(rideId).emit('driverUpdated', { rideId, driverId, currentLocation });
      console.log(`Driver's current location updated for ride ${rideId}`);
    }
  });

  // Handle ride cancellation
  socket.on('cancelRide', async ({ rideId, reason }) => {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) {
        socket.emit('error', { message: 'Ride not found' });
        return;
      }
      ride.status = 'cancelled';
      ride.cancelDetails = { by: socket.role, reason };
      await ride.save();
      io.to(rideId).emit('rideCancelled', { rideId, reason });
      console.log(`Ride ${rideId} cancelled`);
    } catch (err) {
      console.error('Error cancelling ride:', err.message);
      socket.emit('error', { message: 'Error cancelling ride' });
    }
  });

  // Handle ride completion
  socket.on('completeRide', async ({ rideId }) => {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) {
        socket.emit('error', { message: 'Ride not found' });
        return;
      }
      ride.status = 'completed';
      await ride.save();
      io.to(rideId).emit('rideCompleted', { rideId });
      console.log(`Ride ${rideId} completed`);
    } catch (err) {
      console.error('Error completing ride:', err.message);
      socket.emit('error', { message: 'Error completing ride' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.rideId) {
      console.log(`Client ${socket.id} left room ${socket.rideId}`);
      // Socket.IO automatically removes the socket from rooms on disconnect
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
