const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ==========================================
// Middleware Configuration
// ==========================================

// Configure CORS for frontend communication
const allowedOrigins = [
  config.clientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev to avoid blocking local testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// Routes Configuration
// ==========================================

// Welcome / Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to MarketHub API',
    healthCheck: '/api/health',
  });
});

// Mount modular API routes (/api/health, etc.)
app.use('/api', apiRoutes);

// ==========================================
// Error Handling
// ==========================================

// Catch 404 and forward to error handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
