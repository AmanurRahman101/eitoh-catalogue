-- EiToh Studio MySQL Database Schema
-- Database: eitoh_db
-- Database provisioning is handled dynamically by migrate.js
-- CREATE DATABASE IF NOT EXISTS `eitoh_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `eitoh_db`;

-- 1. Users Table (Authentication & Customer Accounts)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `phone` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin', 'operator') NOT NULL DEFAULT 'customer',
  `address` TEXT,
  `city` VARCHAR(100) DEFAULT 'Dhaka',
  `district` VARCHAR(100) DEFAULT 'Dhaka',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(50) PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `icon` VARCHAR(50) DEFAULT 'fa-cubes',
  `badge` VARCHAR(50) DEFAULT 'All',
  `display_order` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(50) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `bangla_title` VARCHAR(255),
  `category_id` VARCHAR(50) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `original_price` DECIMAL(10,2),
  `short_description` TEXT,
  `description` TEXT,
  `stock_status` ENUM('in_stock', 'made_to_order', 'out_of_stock') NOT NULL DEFAULT 'in_stock',
  `in_stock` BOOLEAN NOT NULL DEFAULT TRUE,
  `stock_quantity` INT NOT NULL DEFAULT 20,
  `featured` BOOLEAN NOT NULL DEFAULT FALSE,
  `specs` JSON,
  `colors` JSON,
  `tags` JSON,
  `rating` DECIMAL(2,1) DEFAULT 5.0,
  `reviews_count` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_products_category` (`category_id`),
  INDEX `idx_products_featured` (`featured`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Product Images Table
CREATE TABLE IF NOT EXISTS `product_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(50) NOT NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `is_primary` BOOLEAN DEFAULT FALSE,
  `display_order` INT DEFAULT 0,
  INDEX `idx_images_product` (`product_id`),
  CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `customer_email` VARCHAR(191),
  `delivery_address` TEXT NOT NULL,
  `delivery_city` VARCHAR(100) NOT NULL DEFAULT 'Dhaka',
  `delivery_district` VARCHAR(100) DEFAULT 'Dhaka',
  `delivery_zone` ENUM('inside_dhaka', 'outside_dhaka') NOT NULL DEFAULT 'inside_dhaka',
  `payment_method` ENUM('cash_on_delivery', 'bkash_nagad', 'bank_transfer') NOT NULL DEFAULT 'cash_on_delivery',
  `payment_status` ENUM('pending', 'verified', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  `trx_id` VARCHAR(100) DEFAULT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `coupon_code` VARCHAR(50) DEFAULT NULL,
  `delivery_fee` DECIMAL(10,2) NOT NULL DEFAULT 70.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `order_status` ENUM('confirmed', 'slicing', 'printing', 'finishing', 'dispatched', 'delivered', 'cancelled') NOT NULL DEFAULT 'confirmed',
  `order_notes` TEXT,
  `source` ENUM('web_portal', 'whatsapp', 'admin_manual') NOT NULL DEFAULT 'web_portal',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_orders_user` (`user_id`),
  INDEX `idx_orders_status` (`order_status`),
  INDEX `idx_orders_number` (`order_number`),
  INDEX `idx_orders_phone` (`customer_phone`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` VARCHAR(50) NULL,
  `product_title` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `selected_color` VARCHAR(100) DEFAULT NULL,
  `custom_options` JSON DEFAULT NULL,
  INDEX `idx_order_items_order` (`order_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Order Timeline / Tracking History
CREATE TABLE IF NOT EXISTS `order_timeline` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `stage` VARCHAR(50) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT,
  `completed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_timeline_order` (`order_id`),
  CONSTRAINT `fk_timeline_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Custom 3D Print Quotes Table
CREATE TABLE IF NOT EXISTS `custom_quotes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `quote_number` VARCHAR(50) NOT NULL UNIQUE,
  `user_id` INT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `customer_email` VARCHAR(191),
  `model_name` VARCHAR(255) DEFAULT 'Custom Model',
  `length_cm` DECIMAL(6,2),
  `width_cm` DECIMAL(6,2),
  `height_cm` DECIMAL(6,2),
  `material` VARCHAR(100),
  `infill` INT,
  `quality` VARCHAR(100),
  `est_weight_g` DECIMAL(8,2),
  `est_hours` DECIMAL(6,2),
  `est_price_bdt` DECIMAL(10,2),
  `stl_file_path` VARCHAR(500),
  `notes` TEXT,
  `status` ENUM('pending', 'approved', 'rejected', 'converted_to_order') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_quotes_user` (`user_id`),
  CONSTRAINT `fk_quotes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Coupons Table
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `discount_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `discount_value` DECIMAL(10,2) NOT NULL,
  `min_order_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `max_discount` DECIMAL(10,2) DEFAULT NULL,
  `usage_limit` INT NOT NULL DEFAULT 100,
  `times_used` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `expires_at` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Store Settings Table
CREATE TABLE IF NOT EXISTS `store_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255),
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
