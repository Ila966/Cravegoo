require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const socketio = require('socket.io');

const { connectDB } = require('./config/db');
const seedData = require('./utils/seed');

// Import routes
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const businessRoutes = require('./routes/businessRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Setup Socket.io
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Expose Socket.io instance on request object
app.set('io', io);

// Express Middleware
app.use(cors());

// Configure Helmet with relaxed settings for static assets and scripts CDN (e.g. Tailwind, FontAwesome)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/admin', adminRoutes);

// Catch-all route to serve the SPA / Landing page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io Connection Events
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Socket.io: ${socket.id}`);

  socket.on('join_order', (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`📦 Client joined tracking room for Order ID: ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected from Socket.io: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to Database (auto fallback to memory mock)
  await connectDB();

  // 2. Seed initial data
  await seedData();

  // 3. Start server listen
  server.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start local server:', err);
});
