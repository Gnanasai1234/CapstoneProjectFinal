const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Basic health probe
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const payload = {
    status: isDbConnected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || 'backend',
    environment: process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development',
    database: isDbConnected ? 'connected' : 'disconnected',
  };
  res.status(isDbConnected ? 200 : 503).json(payload);
});

// Basic metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      state: mongoose.connection.readyState,
      models: Object.keys(mongoose.connection.models),
    },
  });
});

// Active environment endpoint — single source of truth for the frontend
app.get('/api/environment', (req, res) => {
  res.json({
    environment: process.env.APP_ENVIRONMENT || 'blue',
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  });
});

module.exports = app;

