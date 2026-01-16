const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const webinarRoutes = require('./routes/webinar');
const { logAudit } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Reveal.js and inline scripts
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Zu viele Anfragen von dieser IP-Adresse. Bitte versuchen Sie es später erneut.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/slides', express.static(path.join(__dirname, '../slides')));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webinar', webinarRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logAudit('ERROR', req.ip, `${err.message}`, { stack: err.stack });
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Interner Serverfehler',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webinar Platform läuft auf Port ${PORT}`);
  console.log(`📁 Datenverzeichnis: ${process.env.DATA_DIR || './data'}`);
  logAudit('SYSTEM', 'localhost', 'Server gestartet');
});

module.exports = app;
