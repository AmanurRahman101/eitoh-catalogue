/**
 * EiToh Database Migration & Seeder Script
 * Sets up eitoh_db, tables, default admin, categories, and products from products.json
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function migrate() {
  console.log('🚀 [EiToh DB Migration] Starting database provisioning...');

  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const dbName = process.env.DB_NAME || 'eitoh_db';

  // Step 1: Connect to server and create database if missing
  let serverConn;
  try {
    serverConn = await mysql.createConnection({ host, user, password, port });
    await serverConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`✅ [EiToh DB Migration] Database \`${dbName}\` confirmed.`);
    await serverConn.end();
  } catch (err) {
    console.error('❌ [EiToh DB Migration] Failed to connect to MySQL server:', err.message);
    process.exit(1);
  }

  // Step 2: Connect directly to the database with multipleStatements enabled
  const db = await mysql.createConnection({
    host,
    user,
    password,
    port,
    database: dbName,
    multipleStatements: true
  });

  try {
    // Step 3: Read schema.sql and execute
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📦 [EiToh DB Migration] Executing schema.sql DDL statements...');
    await db.query(schemaSql);
    console.log('✅ [EiToh DB Migration] All tables verified & created.');

    // Step 4: Seed Default Admin User
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@eitoh.com';
    const adminPass = process.env.DEFAULT_ADMIN_PASSWORD || 'admin1234';
    const adminName = process.env.DEFAULT_ADMIN_NAME || 'EiToh Admin Studio';
    const adminPhone = process.env.DEFAULT_ADMIN_PHONE || '01777547605';

    const [existingAdmin] = await db.query('SELECT id FROM users WHERE email = ?', [adminEmail]);
    if (existingAdmin.length === 0) {
      const passwordHash = await bcrypt.hash(adminPass, 10);
      await db.query(
        `INSERT INTO users (name, email, phone, password_hash, role, city, district)
         VALUES (?, ?, ?, ?, 'admin', 'Dhaka', 'Dhaka')`,
        [adminName, adminEmail, adminPhone, passwordHash]
      );
      console.log(`👑 [EiToh DB Migration] Default Admin created: ${adminEmail} (password: ${adminPass})`);
    } else {
      console.log(`👑 [EiToh DB Migration] Admin user ${adminEmail} already exists.`);
    }

    // Step 5: Seed Categories & Products from frontend/data/products.json
    let productsJsonPath = path.join(__dirname, '..', 'frontend', 'data', 'products.json');
    if (!fs.existsSync(productsJsonPath)) {
      productsJsonPath = path.join(__dirname, '..', 'data', 'products.json');
    }
    if (fs.existsSync(productsJsonPath)) {
      const seedData = JSON.parse(fs.readFileSync(productsJsonPath, 'utf8'));

      // Seed categories
      if (Array.isArray(seedData.categories)) {
        for (let i = 0; i < seedData.categories.length; i++) {
          const cat = seedData.categories[i];
          await db.query(
            `INSERT INTO categories (id, name, icon, badge, display_order)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon), badge = VALUES(badge), display_order = VALUES(display_order)`,
            [cat.id, cat.name, cat.icon || 'fa-cubes', cat.badge || '', i]
          );
        }
        console.log(`📁 [EiToh DB Migration] Seeded ${seedData.categories.length} categories.`);
      }

      // Seed products & images
      if (Array.isArray(seedData.products)) {
        for (const p of seedData.products) {
          const stockStatus = p.stockStatus || (p.inStock === false ? 'out_of_stock' : 'in_stock');
          const inStock = stockStatus === 'in_stock' || stockStatus === 'made_to_order';

          await db.query(
            `INSERT INTO products (
               id, title, bangla_title, category_id, price, original_price,
               short_description, description, stock_status, in_stock, stock_quantity,
               featured, specs, colors, tags, rating, reviews_count
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               title = VALUES(title),
               bangla_title = VALUES(bangla_title),
               price = VALUES(price),
               original_price = VALUES(original_price),
               short_description = VALUES(short_description),
               description = VALUES(description),
               stock_status = VALUES(stock_status),
               in_stock = VALUES(in_stock),
               featured = VALUES(featured),
               specs = VALUES(specs),
               colors = VALUES(colors),
               tags = VALUES(tags)`,
            [
              p.id,
              p.title,
              p.banglaTitle || null,
              p.category,
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
              JSON.stringify(p.tags || []),
              p.rating || 5.0,
              p.reviewsCount || 0
            ]
          );

          // Seed images
          const images = p.images || (p.image ? [p.image] : []);
          for (let imgIdx = 0; imgIdx < images.length; imgIdx++) {
            const imgUrl = images[imgIdx];
            const [existingImg] = await db.query(
              'SELECT id FROM product_images WHERE product_id = ? AND image_url = ?',
              [p.id, imgUrl]
            );
            if (existingImg.length === 0) {
              await db.query(
                `INSERT INTO product_images (product_id, image_url, is_primary, display_order)
                 VALUES (?, ?, ?, ?)`,
                [p.id, imgUrl, imgIdx === 0 ? 1 : 0, imgIdx]
              );
            }
          }
        }
        console.log(`🎨 [EiToh DB Migration] Seeded ${seedData.products.length} products with images.`);
      }

      // Seed default settings
      if (seedData.settings) {
        for (const [key, value] of Object.entries(seedData.settings)) {
          await db.query(
            `INSERT INTO store_settings (setting_key, setting_value)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
            [key, typeof value === 'object' ? JSON.stringify(value) : String(value)]
          );
        }
        console.log('⚙️ [EiToh DB Migration] Seeded store settings.');
      }
    }

    // Seed default coupon
    await db.query(
      `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, usage_limit, is_active)
       VALUES ('EITOH10', 'percentage', 10.00, 500.00, 500, 1)
       ON DUPLICATE KEY UPDATE discount_value = VALUES(discount_value)`
    );
    console.log('🏷️ [EiToh DB Migration] Seeded default coupon: EITOH10 (10% off).');

    console.log('✨ [EiToh DB Migration] Database migration & seeding completed successfully!');
  } catch (err) {
    console.error('❌ [EiToh DB Migration] Error during migration:', err);
    throw err;
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  migrate().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

module.exports = migrate;
