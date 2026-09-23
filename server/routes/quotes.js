/**
 * EiToh Custom 3D Print Quotes API
 * Handles instant custom estimator quote submissions and admin review
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalToken, requireAdmin } = require('../middleware/auth');

function generateQuoteNumber() {
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `QT-${Date.now().toString().slice(-6)}-${rand}`;
}

/**
 * POST /api/quotes
 * Submit a custom 3D print quote
 */
router.post('/', optionalToken, async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      modelName,
      lengthCm,
      widthCm,
      heightCm,
      material,
      infill,
      quality,
      estWeightG,
      estHours,
      estPriceBdt,
      notes
    } = req.body;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        error: 'Contact phone number is required.'
      });
    }

    const quoteNumber = generateQuoteNumber();
    const userId = req.user ? req.user.id : null;

    const [result] = await db.query(
      `INSERT INTO custom_quotes (
         quote_number, user_id, customer_name, customer_phone, customer_email,
         model_name, length_cm, width_cm, height_cm, material, infill, quality,
         est_weight_g, est_hours, est_price_bdt, notes, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        quoteNumber,
        userId,
        customerName || (req.user ? req.user.name : 'Valued Maker'),
        customerPhone.trim(),
        customerEmail || (req.user ? req.user.email : null),
        modelName || 'Custom 3D Model',
        lengthCm || 10,
        widthCm || 8,
        heightCm || 12,
        material || 'Silk PLA',
        infill || 20,
        quality || 'Standard (0.20mm)',
        estWeightG || 100,
        estHours || 10,
        estPriceBdt || 850,
        notes || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Custom quote registered in studio queue.',
      quoteNumber,
      id: result.insertId
    });
  } catch (err) {
    console.error('Quote submission error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit quote.' });
  }
});

/**
 * GET /api/quotes/my-quotes
 * Customer's custom quote submissions
 */
router.get('/my-quotes', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM custom_quotes WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json({ success: true, quotes: rows });
  } catch (err) {
    console.error('Error fetching user quotes:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotes.' });
  }
});

/**
 * GET /api/admin/quotes
 * Studio operator quotes hub
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM custom_quotes ORDER BY created_at DESC');
    return res.json({ success: true, quotes: rows });
  } catch (err) {
    console.error('Error fetching admin quotes:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve quotes.' });
  }
});

/**
 * PATCH /api/admin/quotes/:id/status
 */
router.patch('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.query('UPDATE custom_quotes SET status = ? WHERE id = ?', [status, id]);
    return res.json({ success: true, message: `Quote #${id} status updated to ${status}.` });
  } catch (err) {
    console.error('Error updating quote status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update quote status.' });
  }
});

module.exports = router;
