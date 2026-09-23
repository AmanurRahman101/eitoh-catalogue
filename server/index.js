/**
 * EiToh Studio Full-Stack Server
 * Powered by Node.js, Express, and MySQL (MariaDB)
 */
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logging in Development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Health Check
app.get('/api/health', async (req, res) => {
  const dbOk = await db.testConnection();
  return res.json({
    status: 'ok',
    service: 'EiToh Studio API',
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Register API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/admin', require('./routes/admin'));

// Convenience alias: /api/categories
app.get('/api/categories', (req, res, next) => {
  req.url = '/categories';
  require('./routes/products')(req, res, next);
});

// Serve Frontend Static Files
const staticRoot = path.join(__dirname, '..');
app.use(express.static(staticRoot));

// Fallback to index.html for unknown frontend routes
app.get('/', (req, res) => {
  res.sendFile(path.join(staticRoot, 'index.html'));
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error: ' + (err.message || 'Unknown error')
  });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 EiToh Studio Server is running at: http://localhost:${PORT}`);
  console.log(`🛒 Storefront:  http://localhost:${PORT}/index.html`);
  console.log(`⚙️  Admin CMS:   http://localhost:${PORT}/admin.html`);
  console.log(`📡 API Health:  http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);

  // Verify database connection
  const dbReady = await db.testConnection();
  if (dbReady) {
    console.log('✅ Connected to MySQL database (`eitoh_db`) successfully.');
  } else {
    console.error('⚠️  Warning: MySQL connection failed. Run `npm run migrate` or start MySQL in XAMPP.');
  }
});
