const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const pool = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { initializeSocket } = require('./services/socketHandler');
const { initializeMQTT } = require('./services/mqttHandler');

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const departmentRoutes = require('./routes/departments');
const locationRoutes = require('./routes/locations');
const sensorTypeRoutes = require('./routes/sensorTypes');
const sensorRoutes = require('./routes/sensors');
const dataRoutes = require('./routes/data');
const shiftRoutes = require('./routes/shifts');
const userRoutes = require('./routes/users');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/sensor-types', sensorTypeRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/users', userRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Test database connection and initialize
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Database connection successful');
    
    // Initialize MQTT
    initializeMQTT();

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
        console.error(`\nTo fix this:`);
        console.error(`1. Kill the process using port ${PORT}:`);
        console.error(`   Windows: netstat -ano | findstr :${PORT}  (then kill the PID)`);
        console.error(`   Or: taskkill /PID <PID> /F`);
        console.error(`2. Or change the port in backend/.env file: PORT=5001`);
        console.error(`\n`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
        process.exit(1);
      }
    });
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

