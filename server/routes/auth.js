/**
 * EiToh Auth Routes
 * User registration, login, profile management, and token issuance
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/register
 * Register a new customer account
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, address, city, district } = req.body;

    // Basic Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, phone number, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in.'
      });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, address, city, district)
       VALUES (?, ?, ?, ?, 'customer', ?, ?, ?)`,
      [
        name.trim(),
        cleanEmail,
        phone.trim(),
        passwordHash,
        address ? address.trim() : null,
        city ? city.trim() : 'Dhaka',
        district ? district.trim() : 'Dhaka'
      ]
    );

    const userId = result.insertId;

    // Generate JWT
    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: 'customer' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(201).json({
      success: true,
      message: 'Account successfully registered!',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role: 'customer',
        address: address ? address.trim() : '',
        city: city ? city.trim() : 'Dhaka',
        district: district ? district.trim() : 'Dhaka'
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred during registration.'
    });
  }
});

/**
 * POST /api/auth/login
 * Log in with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user by email (or phone)
    const [rows] = await db.query(
      `SELECT id, name, email, phone, password_hash, role, address, city, district
       FROM users WHERE email = ? OR phone = ?`,
      [cleanEmail, cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const user = rows[0];

    // Verify bcrypt hash
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Signed in successfully!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        address: user.address || '',
        city: user.city || 'Dhaka',
        district: user.district || 'Dhaka'
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during login.'
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieve authenticated user profile
 */
router.get('/me', authenticateToken, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/profile
 * Update customer profile details & default delivery address
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, address, city, district } = req.body;
    const userId = req.user.id;

    await db.query(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           district = COALESCE(?, district)
       WHERE id = ?`,
      [name || null, phone || null, address || null, city || null, district || null, userId]
    );

    const [updated] = await db.query(
      'SELECT id, name, email, phone, role, address, city, district FROM users WHERE id = ?',
      [userId]
    );

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated[0]
    });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

module.exports = router;
