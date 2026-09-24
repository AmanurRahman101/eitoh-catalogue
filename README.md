# EiToh (এইতো) — Precision 3D Printing & Maker Catalog v2.0 (Full-Stack)

A production-grade, full-stack 3D Printing E-Commerce Storefront, Maker Catalog, and CMS Management Suite powered by **Node.js, Express, a relational MySQL database (`eitoh_db`), and salted JWT authentication**.

---

## 📁 Decoupled Project Structure

The codebase is organized into cleanly separated **`frontend/`** and **`backend/`** architectures:

```
Eitoh Catalogue/
├── frontend/                     # Pure client-side static application
│   ├── index.html                # Storefront, 3D Estimator, Auth & Checkout
│   ├── admin.html                # Management Studio & Orders Hub CMS
│   ├── css/
│   │   ├── style.css             # Mineral & Obsidian design system, dark mode & components
│   │   └── admin.css             # Admin dashboard styling, tables, dropzone & badges
│   ├── js/
│   │   ├── api.js                # Unified REST API client (Fetch + Bearer JWT)
│   │   ├── auth.js               # Auth modal, customer profile widget & My Orders portal
│   │   ├── data.js               # StorageManager (hybrid offline cache & API sync)
│   │   ├── app.js                # Storefront catalog, cart, 3D estimator & checkout
│   │   ├── admin.js              # CMS Orders Hub, inventory, coupons & analytics
│   │   └── utils.js              # Security helpers (XSS sanitizer, Canvas image compressor)
│   ├── assets/
│   │   ├── logo.jpg              # EiToh studio brand mark
│   │   └── images/               # High-resolution 3D print photography
│   └── data/
│       └── products.json         # Seed catalog & store settings definition
│
├── backend/                      # Node.js & Express REST API Server
│   ├── index.js                  # Central Express server entrypoint & static host
│   ├── db.js                     # MySQL connection pooling (mysql2/promise)
│   ├── migrate.js                # Auto-migration & seeder for MySQL tables & admin
│   ├── schema.sql                # 10 relational tables DDL (users, products, orders, etc.)
│   ├── middleware/
│   │   └── auth.js               # JWT verification & Role-Based Access Control (RBAC)
│   └── routes/
│       ├── auth.js               # User registration, login, me, and profile updates
│       ├── products.js           # Public catalog query & admin inventory CRUD
│       ├── orders.js             # Atomic order checkout, customer history & tracking
│       ├── quotes.js             # Custom 3D print estimator quotes API
│       └── admin.js              # Real-time SQL analytics, coupons & store settings
│
├── .env                          # Local database & JWT credentials
├── .env.example                  # Template configuration file
├── package.json                  # Root orchestration & dependency scripts
└── README.md                     # Documentation
```

---

## ⚡ Quick Start

### 1. Requirements
- **Node.js**: v18+ (tested on v24.12.0)
- **MySQL / MariaDB**: (e.g. via XAMPP on port 3306)

### 2. Environment Setup
Configure your database credentials in `.env`:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=eitoh_db
DB_PORT=3306
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Database Migration & Seeding
Run the automated migration to create `eitoh_db`, all 10 relational tables, and seed initial products and the default admin:
```bash
npm run migrate
```

### 4. Run the Full-Stack Server
```bash
npm start
```

- **Storefront**: [http://localhost:5000/](http://localhost:5000/)
- **Admin CMS**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html) (Default PIN: `1234` or Admin account: `admin@eitoh.com` / `admin1234`)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)
