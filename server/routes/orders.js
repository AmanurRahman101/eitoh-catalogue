/**
 * EiToh Orders API
 * Transactional checkout, user order history, public tracking, and admin orders hub
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, optionalToken, requireAdmin } = require('../middleware/auth');

/**
 * Generate unique Order Number: EIT-YYYYMMDD-XXXX
 */
function generateOrderNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EIT-${yyyy}${mm}${dd}-${randomPart}`;
}

/**
 * Stage descriptions for timeline events
 */
const STAGE_META = {
  confirmed: { title: 'Order Received & Confirmed', desc: 'Order registered in EiToh studio production queue.' },
  slicing: { title: 'STL Slicing & Engineering Prep', desc: 'G-code generated, layer heights and infill optimized.' },
  printing: { title: '3D Printing on Build Plate', desc: 'Precision FDM print underway at 0.16mm layer height.' },
  finishing: { title: 'Post-Processing & QA Inspection', desc: 'Supports removed, edges hand-finished, tolerance inspected.' },
  dispatched: { title: 'Handed to Courier Partner', desc: 'Package sealed and handed over for delivery.' },
  delivered: { title: 'Delivered to Customer', desc: 'Package arrived safely at destination.' },
  cancelled: { title: 'Order Cancelled', desc: 'Order was cancelled or refunded.' }
};

/**
 * POST /api/orders
 * Create an order (Supports logged-in customers and guest checkout)
 */
router.post('/', optionalToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryCity,
      deliveryDistrict,
      deliveryZone,
      paymentMethod,
      trxId,
      items,
      couponCode,
      orderNotes
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Customer name, phone number, and delivery address are required.'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item.'
      });
    }

    // Begin Database Transaction
    await conn.beginTransaction();

    // 1. Calculate subtotal & verify items
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = parseInt(item.quantity || 1, 10);
      const price = parseFloat(item.price || item.unitPrice || 0);
      const itemTotal = price * qty;
      subtotal += itemTotal;

      validatedItems.push({
        productId: item.productId || item.id || null,
        title: item.title || item.productTitle || 'Custom Print',
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
        selectedColor: item.selectedColor || item.color || null,
        customOptions: item.customOptions || {}
      });
    }

    // 2. Validate Coupon (if provided)
    let discount = 0;
    let validCouponCode = null;
    if (couponCode && couponCode.trim()) {
      const [couponRows] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1',
        [couponCode.trim().toUpperCase()]
      );

      if (couponRows.length > 0) {
        const c = couponRows[0];
        if (subtotal >= parseFloat(c.min_order_amount)) {
          validCouponCode = c.code;
          if (c.discount_type === 'percentage') {
            discount = (subtotal * parseFloat(c.discount_value)) / 100;
            if (c.max_discount && discount > parseFloat(c.max_discount)) {
              discount = parseFloat(c.max_discount);
            }
          } else {
            discount = parseFloat(c.discount_value);
          }

          // Increment coupon usage
          await conn.query('UPDATE coupons SET times_used = times_used + 1 WHERE id = ?', [c.id]);
        }
      }
    }

    // 3. Calculate Delivery Fee
    const zone = deliveryZone === 'outside_dhaka' ? 'outside_dhaka' : 'inside_dhaka';
    const deliveryFee = subtotal >= 2500 ? 0 : (zone === 'outside_dhaka' ? 130 : 70);
    const totalAmount = Math.max(0, subtotal - discount + deliveryFee);

    // 4. Generate unique order number
    const orderNumber = generateOrderNumber();
    const userId = req.user ? req.user.id : null;

    // 5. Insert Order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (
         order_number, user_id, customer_name, customer_phone, customer_email,
         delivery_address, delivery_city, delivery_district, delivery_zone,
         payment_method, payment_status, trx_id, subtotal, discount, coupon_code,
         delivery_fee, total_amount, order_status, order_notes, source
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, 'web_portal')`,
      [
        orderNumber,
        userId,
        customerName.trim(),
        customerPhone.trim(),
        customerEmail ? customerEmail.trim() : null,
        deliveryAddress.trim(),
        deliveryCity ? deliveryCity.trim() : 'Dhaka',
        deliveryDistrict ? deliveryDistrict.trim() : 'Dhaka',
        zone,
        paymentMethod || 'cash_on_delivery',
        paymentMethod === 'cash_on_delivery' ? 'pending' : (trxId ? 'paid' : 'pending'),
        trxId ? trxId.trim() : null,
        subtotal,
        discount,
        validCouponCode,
        deliveryFee,
        totalAmount,
        orderNotes ? orderNotes.trim() : null
      ]
    );

    const orderId = orderResult.insertId;

    // 6. Insert Order Items
    for (const item of validatedItems) {
      await conn.query(
        `INSERT INTO order_items (
           order_id, product_id, product_title, quantity, unit_price,
           total_price, selected_color, custom_options
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.productId,
          item.title,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.selectedColor,
          JSON.stringify(item.customOptions)
        ]
      );

      // Decrement product stock if available
      if (item.productId) {
        await conn.query(
          'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
          [item.quantity, item.productId]
        );
      }
    }

    // 7. Insert Initial Order Timeline Entry
    await conn.query(
      `INSERT INTO order_timeline (order_id, stage, title, description)
       VALUES (?, 'confirmed', ?, ?)`,
      [orderId, STAGE_META.confirmed.title, STAGE_META.confirmed.desc]
    );

    // Commit Transaction
    await conn.commit();

    return res.status(201).json({
      success: true,
      message: 'Order created successfully!',
      orderNumber,
      orderId,
      subtotal,
      discount,
      deliveryFee,
      totalAmount,
      paymentMethod: paymentMethod || 'cash_on_delivery'
    });
  } catch (err) {
    await conn.rollback();
    console.error('Order creation error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to place order: ' + err.message
    });
  } finally {
    conn.release();
  }
});

/**
 * GET /api/orders/my-orders
 * Return all orders for the authenticated customer
 */
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await db.query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    if (orders.length === 0) {
      return res.json({ success: true, count: 0, orders: [] });
    }

    const orderIds = orders.map(o => o.id);

    // Fetch items
    const [items] = await db.query(
      `SELECT * FROM order_items WHERE order_id IN (?) ORDER BY id ASC`,
      [orderIds]
    );

    // Fetch timeline
    const [timeline] = await db.query(
      `SELECT * FROM order_timeline WHERE order_id IN (?) ORDER BY completed_at ASC`,
      [orderIds]
    );

    // Group items & timeline by order_id
    const itemsMap = {};
    items.forEach(it => {
      if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
      itemsMap[it.order_id].push(it);
    });

    const timelineMap = {};
    timeline.forEach(tl => {
      if (!timelineMap[tl.order_id]) timelineMap[tl.order_id] = [];
      timelineMap[tl.order_id].push(tl);
    });

    const enrichedOrders = orders.map(o => ({
      ...o,
      items: itemsMap[o.id] || [],
      timeline: timelineMap[o.id] || []
    }));

    return res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
  }
});

/**
 * GET /api/orders/track/:orderNumber
 * Public order tracking endpoint
 */
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const [orders] = await db.query(
      `SELECT id, order_number, customer_name, customer_phone, delivery_city,
              payment_method, payment_status, total_amount, order_status, created_at
       FROM orders WHERE order_number = ?`,
      [orderNumber.trim().toUpperCase()]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const order = orders[0];

    // Fetch items
    const [items] = await db.query(
      'SELECT product_title, quantity, unit_price, total_price, selected_color FROM order_items WHERE order_id = ?',
      [order.id]
    );

    // Fetch timeline
    const [timeline] = await db.query(
      'SELECT stage, title, description, completed_at FROM order_timeline WHERE order_id = ? ORDER BY completed_at ASC',
      [order.id]
    );

    // Mask phone for privacy in public tracking (e.g., 0177****605)
    let maskedPhone = order.customer_phone;
    if (maskedPhone && maskedPhone.length > 6) {
      maskedPhone = maskedPhone.slice(0, 4) + '****' + maskedPhone.slice(-3);
    }

    return res.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: maskedPhone,
        city: order.delivery_city,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        totalAmount: parseFloat(order.total_amount),
        orderStatus: order.order_status,
        createdAt: order.created_at,
        items,
        timeline
      }
    });
  } catch (err) {
    console.error('Tracking query error:', err);
    return res.status(500).json({ success: false, error: 'Failed to track order.' });
  }
});

/**
 * GET /api/admin/orders
 * Admin Orders Hub with search, status filtering, and pagination
 */
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let sql = 'SELECT * FROM orders WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND order_status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      sql += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [orders] = await db.query(sql, params);

    if (orders.length === 0) {
      return res.json({ success: true, count: 0, orders: [] });
    }

    const orderIds = orders.map(o => o.id);
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id IN (?)', [orderIds]);

    const itemsMap = {};
    items.forEach(it => {
      if (!itemsMap[it.order_id]) itemsMap[it.order_id] = [];
      itemsMap[it.order_id].push(it);
    });

    const enriched = orders.map(o => ({
      ...o,
      items: itemsMap[o.id] || []
    }));

    return res.json({ success: true, count: enriched.length, orders: enriched });
  } catch (err) {
    console.error('Admin orders query error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve orders.' });
  }
});

/**
 * PATCH /api/admin/orders/:id/status
 * Update order production status & append timeline step
 */
router.patch('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['confirmed', 'slicing', 'printing', 'finishing', 'dispatched', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid order status value.' });
    }

    await conn.beginTransaction();

    // Update order status
    await conn.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, id]);

    // Append to timeline
    const meta = STAGE_META[status] || { title: `Status: ${status}`, desc: notes || '' };
    await conn.query(
      `INSERT INTO order_timeline (order_id, stage, title, description)
       VALUES (?, ?, ?, ?)`,
      [id, status, meta.title, notes || meta.desc]
    );

    await conn.commit();

    return res.json({
      success: true,
      message: `Order #${id} updated to status "${status}".`
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, error: 'Failed to update order status.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
