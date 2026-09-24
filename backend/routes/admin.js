/**
 * EiToh Admin Studio API
 * Real-time analytics, coupon management, and store configuration
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * GET /api/admin/analytics
 * Real-time MySQL-calculated financial and studio metrics
 */
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // 1. Total revenue & count from orders (excluding cancelled)
    const [revRows] = await db.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_orders,
        COALESCE(AVG(total_amount), 0) AS avg_order_value
      FROM orders
      WHERE order_status != 'cancelled'
    `);

    // 2. Orders count by status
    const [statusRows] = await db.query(`
      SELECT order_status, COUNT(id) AS count
      FROM orders
      GROUP BY order_status
    `);

    // 3. Products in stock count vs low stock
    const [prodRows] = await db.query(`
      SELECT 
        COUNT(id) AS total_products,
        SUM(CASE WHEN in_stock = 1 THEN 1 ELSE 0 END) AS active_products,
        SUM(CASE WHEN stock_quantity <= 5 THEN 1 ELSE 0 END) AS low_stock_products
      FROM products
    `);

    // 4. Custom quotes count
    const [quoteRows] = await db.query(`
      SELECT COUNT(id) AS total_quotes,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_quotes
      FROM custom_quotes
    `);

    // 5. Registered users count
    const [userRows] = await db.query(`
      SELECT 
        COUNT(id) AS total_users,
        SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) AS total_customers
      FROM users
    `);

    // 6. Top selling items
    const [topSellers] = await db.query(`
      SELECT 
        oi.product_title,
        SUM(oi.quantity) AS total_units_sold,
        SUM(oi.total_price) AS total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.order_status != 'cancelled'
      GROUP BY oi.product_title
      ORDER BY total_units_sold DESC
      LIMIT 5
    `);

    return res.json({
      success: true,
      analytics: {
        totalRevenue: parseFloat(revRows[0].total_revenue),
        totalOrders: parseInt(revRows[0].total_orders, 10),
        avgOrderValue: parseFloat(revRows[0].avg_order_value),
        ordersByStatus: statusRows.reduce((acc, row) => {
          acc[row.order_status] = row.count;
          return acc;
        }, {}),
        products: prodRows[0],
        quotes: quoteRows[0],
        users: userRows[0],
        topSellers
      }
    });
  } catch (err) {
    console.error('Analytics aggregation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to compute analytics.' });
  }
});

/**
 * GET /api/admin/coupons
 */
router.get('/coupons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.json({ success: true, coupons: rows });
  } catch (err) {
    console.error('Error fetching coupons:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve coupons.' });
  }
});

/**
 * POST /api/admin/coupons
 */
router.post('/coupons', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, usageLimit } = req.body;
    if (!code || !discountValue) {
      return res.status(400).json({ success: false, error: 'Code and discount value required.' });
    }

    await db.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, usage_limit)
       VALUES (?, ?, ?, ?, ?)`,
      [
        code.trim().toUpperCase(),
        discountType || 'percentage',
        parseFloat(discountValue),
        parseFloat(minOrderAmount || 0),
        parseInt(usageLimit || 100, 10)
      ]
    );

    return res.status(201).json({ success: true, message: 'Coupon created successfully.' });
  } catch (err) {
    console.error('Error creating coupon:', err);
    return res.status(500).json({ success: false, error: 'Failed to create coupon: ' + err.message });
  }
});

/**
 * DELETE /api/admin/coupons/:id
 */
router.delete('/coupons/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete coupon.' });
  }
});

/**
 * Public Coupon Validator: POST /api/admin/coupons/validate
 */
router.post('/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Coupon code required.' });
    }

    const [rows] = await db.query(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
      [code.trim().toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid or expired coupon code.' });
    }

    const coupon = rows[0];
    const orderSubtotal = parseFloat(subtotal || 0);

    if (orderSubtotal < parseFloat(coupon.min_order_amount)) {
      return res.status(400).json({
        success: false,
        error: `Minimum order amount for this coupon is ৳${coupon.min_order_amount}.`
      });
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = (orderSubtotal * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount && discount > parseFloat(coupon.max_discount)) {
        discount = parseFloat(coupon.max_discount);
      }
    } else {
      discount = parseFloat(coupon.discount_value);
    }

    return res.json({
      success: true,
      valid: true,
      code: coupon.code,
      discountType: coupon.discount_type,
      discountValue: parseFloat(coupon.discount_value),
      discountAmount: discount
    });
  } catch (err) {
    console.error('Coupon validation error:', err);
    return res.status(500).json({ success: false, error: 'Failed to validate coupon.' });
  }
});

/**
 * GET /api/admin/settings & PUT /api/admin/settings
 */
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM store_settings');
    const settings = {};
    rows.forEach(r => {
      try {
        settings[r.setting_key] = JSON.parse(r.setting_value);
      } catch (e) {
        settings[r.setting_key] = r.setting_value;
      }
    });
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve settings.' });
  }
});

router.put('/settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Settings object required.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO store_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]
      );
    }

    return res.json({ success: true, message: 'Settings saved.' });
  } catch (err) {
    console.error('Error saving settings:', err);
    return res.status(500).json({ success: false, error: 'Failed to save settings.' });
  }
});

module.exports = router;
