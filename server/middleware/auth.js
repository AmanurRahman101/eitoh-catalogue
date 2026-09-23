/**
 * EiToh Auth Middleware
 * Verifies JWT tokens and enforces Role-Based Access Control (RBAC)
 */
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'eitoh_default_jwt_secret_dev_key';

/**
 * Enforces authenticated user token
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access denied. Authentication token required.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch fresh user from DB to ensure account is active and role is current
    const [rows] = await db.query(
      'SELECT id, name, email, phone, role, address, city, district FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User account not found.' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or expired authentication token.'
    });
  }
}

/**
 * Optional token extraction (for guest checkout where user might or might not be logged in)
 */
async function optionalToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await db.query(
      'SELECT id, name, email, phone, role, address, city, district FROM users WHERE id = ?',
      [decoded.id]
    );
    req.user = rows[0] || null;
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * Enforces admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Store Administrator privileges required.'
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  optionalToken,
  requireAdmin,
  JWT_SECRET
};
