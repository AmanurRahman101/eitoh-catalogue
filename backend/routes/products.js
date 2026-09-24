/**
 * EiToh Products & Categories API
 * Handles public catalog listing, search, category filters, and admin inventory control
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

/**
 * Helper to normalize and parse product records
 */
function formatProduct(p, imagesMap = {}) {
  let specs = {};
  let colors = [];
  let tags = [];

  try {
    specs = typeof p.specs === 'string' ? JSON.parse(p.specs) : (p.specs || {});
  } catch (e) { specs = {}; }

  try {
    colors = typeof p.colors === 'string' ? JSON.parse(p.colors) : (p.colors || []);
  } catch (e) { colors = []; }

  try {
    tags = typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []);
  } catch (e) { tags = []; }

  const images = imagesMap[p.id] || [];
  const primaryImg = images.find(img => img.is_primary)?.image_url || images[0]?.image_url || 'assets/logo.jpg';

  return {
    id: p.id,
    title: p.title,
    banglaTitle: p.bangla_title,
    category: p.category_id,
    categoryName: p.category_name || p.category_id,
    price: parseFloat(p.price),
    originalPrice: p.original_price ? parseFloat(p.original_price) : null,
    shortDescription: p.short_description || '',
    description: p.description || '',
    stockStatus: p.stock_status,
    inStock: Boolean(p.in_stock),
    stockQuantity: p.stock_quantity,
    featured: Boolean(p.featured),
    specs,
    colors,
    tags,
    rating: parseFloat(p.rating || 5.0),
    reviewsCount: p.reviews_count || 0,
    image: primaryImg,
    images: images.length > 0 ? images.map(img => img.image_url) : [primaryImg],
    createdAt: p.created_at
  };
}

/**
 * GET /api/products/categories
 * Returns all active categories
 */
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
    return res.json({ success: true, categories: rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve categories.' });
  }
});

/**
 * GET /api/products
 * Query products with optional category, search, and sort filters
 */
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, featured } = req.query;

    let sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND p.category_id = ?';
      params.push(category);
    }

    if (featured === 'true' || featured === '1') {
      sql += ' AND p.featured = 1';
    }

    if (search && search.trim()) {
      sql += ' AND (p.title LIKE ? OR p.bangla_title LIKE ? OR p.description LIKE ? OR p.tags LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    // Sorting
    if (sort === 'price_asc') {
      sql += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      sql += ' ORDER BY p.price DESC';
    } else if (sort === 'rating') {
      sql += ' ORDER BY p.rating DESC, p.reviews_count DESC';
    } else if (sort === 'newest') {
      sql += ' ORDER BY p.created_at DESC';
    } else {
      sql += ' ORDER BY p.featured DESC, p.created_at DESC';
    }

    const [products] = await db.query(sql, params);

    // Fetch images for all matched products
    const [images] = await db.query(
      'SELECT product_id, image_url, is_primary FROM product_images ORDER BY display_order ASC'
    );

    const imagesMap = {};
    images.forEach(img => {
      if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
      imagesMap[img.product_id].push(img);
    });

    const formatted = products.map(p => formatProduct(p, imagesMap));
    return res.json({ success: true, count: formatted.length, products: formatted });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve products.' });
  }
});

/**
 * GET /api/products/:id
 * Retrieve a single product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const [images] = await db.query(
      'SELECT product_id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY display_order ASC',
      [id]
    );

    const imagesMap = { [id]: images };
    return res.json({ success: true, product: formatProduct(rows[0], imagesMap) });
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve product.' });
  }
});

/**
 * POST /api/products/admin
 * Create a new product (Protected: Admin only)
 */
router.post('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || `eitoh-${Date.now().toString(36)}`;

    const stockStatus = p.stockStatus || 'in_stock';
    const inStock = stockStatus === 'in_stock' || stockStatus === 'made_to_order';

    await db.query(
      `INSERT INTO products (
         id, title, bangla_title, category_id, price, original_price,
         short_description, description, stock_status, in_stock, stock_quantity,
         featured, specs, colors, tags
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        p.title,
        p.banglaTitle || null,
        p.category || 'articulated',
        p.price,
        p.originalPrice || null,
        p.shortDescription || '',
        p.description || '',
        stockStatus,
        inStock ? 1 : 0,
        p.stockQuantity || 20,
        p.featured ? 1 : 0,
        JSON.stringify(p.specs || {}),
        JSON.stringify(p.colors || []),
        JSON.stringify(p.tags || [])
      ]
    );

    // Insert images
    const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
    for (let i = 0; i < images.length; i++) {
      await db.query(
        'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)',
        [id, images[i], i === 0 ? 1 : 0, i]
      );
    }

    return res.status(201).json({ success: true, message: 'Product created successfully.', id });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ success: false, error: 'Failed to create product. Please verify fields and try again.' });
  }
});

/**
 * PUT /api/products/admin/:id
 * Update an existing product (Protected: Admin only)
 */
router.put('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const p = req.body;

    const stockStatus = p.stockStatus || 'in_stock';
    const inStock = stockStatus === 'in_stock' || stockStatus === 'made_to_order';

    await db.query(
      `UPDATE products SET
         title = COALESCE(?, title),
         bangla_title = COALESCE(?, bangla_title),
         category_id = COALESCE(?, category_id),
         price = COALESCE(?, price),
         original_price = ?,
         short_description = COALESCE(?, short_description),
         description = COALESCE(?, description),
         stock_status = ?,
         in_stock = ?,
         stock_quantity = COALESCE(?, stock_quantity),
         featured = COALESCE(?, featured),
         specs = COALESCE(?, specs),
         colors = COALESCE(?, colors),
         tags = COALESCE(?, tags)
       WHERE id = ?`,
      [
        p.title || null,
        p.banglaTitle || null,
        p.category || null,
        p.price || null,
        p.originalPrice !== undefined ? p.originalPrice : null,
        p.shortDescription || null,
        p.description || null,
        stockStatus,
        inStock ? 1 : 0,
        p.stockQuantity !== undefined ? p.stockQuantity : null,
        p.featured !== undefined ? (p.featured ? 1 : 0) : null,
        p.specs ? JSON.stringify(p.specs) : null,
        p.colors ? JSON.stringify(p.colors) : null,
        p.tags ? JSON.stringify(p.tags) : null,
        id
      ]
    );

    // If new images provided, update them
    if (Array.isArray(p.images) && p.images.length > 0) {
      await db.query('DELETE FROM product_images WHERE product_id = ?', [id]);
      for (let i = 0; i < p.images.length; i++) {
        await db.query(
          'INSERT INTO product_images (product_id, image_url, is_primary, display_order) VALUES (?, ?, ?, ?)',
          [id, p.images[i], i === 0 ? 1 : 0, i]
        );
      }
    }

    return res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ success: false, error: 'Failed to update product. Please verify fields and try again.' });
  }
});

/**
 * DELETE /api/products/admin/:id
 * Delete product (Protected: Admin only)
 */
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete product.' });
  }
});

module.exports = router;
