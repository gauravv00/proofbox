const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes from backend
const authRoutes = require('../backend/routes/auth');
const { router: casesRoutes } = require('../backend/routes/cases');
const exhibitsRoutes = require('../backend/routes/exhibits');
const claimsRoutes   = require('../backend/routes/claims');
const exportRoutes   = require('../backend/routes/export');
const chatRoutes     = require('../backend/routes/chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ProofBox Serverless API',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api', exhibitsRoutes);
app.use('/api', claimsRoutes);
app.use('/api', exportRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
