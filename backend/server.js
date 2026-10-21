const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const authRoutes = require('./routes/auth');
const { router: casesRoutes } = require('./routes/cases');
const exhibitsRoutes = require('./routes/exhibits');
const claimsRoutes = require('./routes/claims');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists on startup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (must be before protected routes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ProofBox API',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api', exhibitsRoutes);
app.use('/api', claimsRoutes);
app.use('/api', exportRoutes);

// Serve frontend static files from proofbox root
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA fallback for HTML requests not matching /api
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }
  const indexPath = path.join(rootDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`ProofBox API running on http://localhost:${PORT}`);
});

module.exports = app;
