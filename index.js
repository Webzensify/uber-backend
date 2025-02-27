require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
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

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Socket.IO Server
const io = new Server(server, {
  cors: { origin: '*' }, // Allow all origins (adjust for production)
});

io.on('connection', (socket) => {
  console.log('New Socket.IO connection:', socket.id);

  // Handle join event
  socket.on('join', (data) => {
    const { rideId, userId, driverId } = data || {};

    if (!rideId) {
      socket.emit('error', { message: 'rideId required' });
      return;
    }

    // Join the rideId room
    socket.join(rideId);
    socket.rideId = rideId; // Store rideId on the socket object
    console.log(`Client ${socket.id} joined room ${rideId}`);

    // Notify client of successful join
    socket.emit('joined', { rideId });
  });

  // Handle coordinates event
  socket.on('coordinates', (data) => {
    const { rideId, coordinates, userId, driverId } = data || {};

    if (!rideId || !coordinates) {
      socket.emit('error', { message: 'rideId and coordinates required' });
      return;
    }

    // Broadcast coordinates to other clients in the room
    socket.to(rideId).emit('coordinates', {
      rideId,
      sender: userId ? 'user' : 'driver',
      coordinates,
    });
    console.log(`Coordinates sent to room ${rideId} from ${userId ? 'user' : 'driver'}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.rideId) {
      console.log(`Client ${socket.id} left room ${socket.rideId}`);
      // Socket.IO automatically removes the socket from rooms on disconnect
    }
  });
});