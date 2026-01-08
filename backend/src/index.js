require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const groupsRoutes = require('./routes/groups');
const panicRoutes = require('./routes/panic');
const settingsRoutes = require('./routes/settings');
const adminRoutes = require('./routes/admin');
const itineraryRoutes = require('./routes/itinerary');
const notificationRoutes = require('./routes/notifications');
const pushRoutes = require('./routes/push');

const app = express();
const server = http.createServer(app);

// Socket.IO setup for real-time
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for testing
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: true, // Reflect request origin (allow all)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token', 'ngrok-skip-browser-warning']
}));

// Handle preflight specifically for peace of mind
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Make io accessible to routes
app.set('io', io);

// Socket.IO Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.token;

  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/panic', panicRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint tidak ditemukan' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER_ERROR:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Terjadi kesalahan pada server',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'ITJ Travel API is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const { id: userId, groupId } = socket.user;
  console.log(`[Socket] User connected: ${socket.id}`);
  console.log(`[Socket] User details: userId=${userId}, groupId=${groupId}`);
  console.log(`[Socket] Full decoded token:`, socket.user);

  // Automatically join their group room
  if (groupId) {
    socket.join(`group-${groupId}`);
    console.log(`[Socket] Socket ${socket.id} joined room group-${groupId}`);
  } else {
    console.log(`[Socket] Socket ${socket.id} has no groupId, not joining any room`);
  }

  // Location update
  socket.on('location-update', (data) => {
    const { latitude, longitude } = data;

    console.log(`[Socket] location-update from user ${userId} in group ${groupId}:`, { latitude, longitude });

    if (!groupId) {
      console.log(`[Socket] No groupId for user ${userId}, not broadcasting`);
      return;
    }

    // Broadcast to all users in the same group
    console.log(`[Socket] Broadcasting to group-${groupId}`);
    socket.to(`group-${groupId}`).emit('user-location-updated', {
      userId: String(userId),
      location: { lat: latitude, lng: longitude, timestamp: Date.now() }
    });
  });

  // Panic alert
  socket.on('panic-alert', (data) => {
    const { alert } = data;

    if (!groupId) return;

    // Broadcast panic alert to all users in the same group
    io.to(`group-${groupId}`).emit('new-panic-alert', alert);
  });

  // Panic resolved
  socket.on('panic-resolved', (data) => {
    const { alertId } = data;

    if (!groupId) return;

    io.to(`group-${groupId}`).emit('panic-alert-resolved', { alertId, userId });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ITJ Travel API running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Socket.IO ready for real-time connections`);
});
