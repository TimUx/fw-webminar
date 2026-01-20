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

// Trust proxy when behind reverse proxy (Caddy)
// Set to 1 to trust only the first proxy (Caddy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Reveal.js and inline scripts
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Zu viele Anfragen von dieser IP-Adresse. Bitte versuchen Sie es später erneut.',
  // Disable strict trust proxy validation - we handle proxy trust via app.set('trust proxy', 1)
  validate: { trustProxy: false }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/assets', express.static(path.join(__dirname, '../assets')));
app.use('/slides', express.static(path.join(__dirname, '../slides')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/node_modules', express.static(path.join(__dirname, '../node_modules')));
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
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Webinar Platform läuft auf Port ${PORT}`);
  console.log(`📁 Datenverzeichnis: ${process.env.DATA_DIR || './data'}`);
  logAudit('SYSTEM', 'localhost', 'Server gestartet');
});

// Graceful shutdown handling
let isShuttingDown = false;
const gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  
  console.log(`\n${signal} empfangen. Beginne graceful shutdown...`);
  logAudit('SYSTEM', 'localhost', `Server shutdown initiiert (${signal})`);
  
  // Force shutdown after 10 seconds
  const forceShutdownTimer = setTimeout(() => {
    console.error('⚠️  Graceful shutdown timeout - Erzwinge Beendigung');
    process.exit(1);
  }, 10000);

  server.close(() => {
    clearTimeout(forceShutdownTimer);
    console.log('✅ Server erfolgreich heruntergefahren');
    logAudit('SYSTEM', 'localhost', 'Server erfolgreich heruntergefahren');
    process.exit(0);
  });
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
