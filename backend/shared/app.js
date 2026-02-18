const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();

// ──────────────────────────────────────────────
// Prometheus Metrics (isolated, fail-safe)
// If prom-client is missing or fails, the app runs normally without metrics.
// ──────────────────────────────────────────────
let metricsRegistry = null;
let metricsMiddleware = null;
try {
  const client = require('prom-client');

  // Create a dedicated registry so we don't pollute the global one
  metricsRegistry = new client.Registry();

  // Add default Node.js metrics (CPU, memory, event loop, GC)
  client.collectDefaultMetrics({
    register: metricsRegistry,
    labels: { environment: process.env.APP_ENVIRONMENT || 'blue' }
  });

  // Custom metric: HTTP request counter
  const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'environment'],
    registers: [metricsRegistry]
  });

  // Custom metric: HTTP request duration
  const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code', 'environment'],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [metricsRegistry]
  });

  // Middleware to record metrics — registered after cors/json below via metricsMiddleware
  metricsMiddleware = (req, res, next) => {
    // Skip /metrics endpoint to avoid self-instrumentation
    if (req.path === '/metrics') return next();

    const end = httpRequestDuration.startTimer();
    const env = process.env.APP_ENVIRONMENT || 'blue';

    res.on('finish', () => {
      // Use matched route pattern (e.g. '/api/users/:id') not raw path
      // to prevent unbounded label cardinality from dynamic segments / 404 scans
      const route = req.route ? req.route.path : (res.statusCode === 404 ? 'UNMATCHED' : req.path);
      const labels = {
        method: req.method,
        route: route,
        status_code: res.statusCode,
        environment: env
      };
      httpRequestsTotal.inc(labels);
      end(labels);
    });

    next();
  };

  console.log('📊 Prometheus metrics enabled');
} catch (err) {
  console.warn('⚠️  Prometheus metrics disabled (prom-client not available):', err.message);
}

// Global middleware
app.use(cors());
app.use(express.json());

// Metrics middleware (must be AFTER body parsers, BEFORE route handlers)
if (metricsMiddleware) app.use(metricsMiddleware);

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

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  if (!metricsRegistry) {
    // Fallback: if prom-client not loaded, return basic JSON (backward compat)
    return res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: {
        state: mongoose.connection.readyState,
        models: Object.keys(mongoose.connection.models),
      },
    });
  }

  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
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

