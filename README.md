# EiToh (এইতো) — Precision 3D Printing & Maker Catalog v2.0

🌐 **Live Website**: [https://amanurrahman101.github.io/eitoh-catalogue/](https://amanurrahman101.github.io/eitoh-catalogue/)  
📦 **GitHub Repository**: [https://github.com/AmanurRahman101/eitoh-catalogue](https://github.com/AmanurRahman101/eitoh-catalogue)  
⚙️ **Admin CMS**: [https://amanurrahman101.github.io/eitoh-catalogue/admin.html](https://amanurrahman101.github.io/eitoh-catalogue/admin.html) (Default PIN: `1234`)

A production-grade, responsive, luxury editorial 3D Printing Storefront, Maker Catalog, and CMS Suite built with pure **HTML5, Vanilla CSS3, and JavaScript (ES6+)**. Fully zero-dependency, ultra-fast, and hardened against common web security risks.

---

## 🌟 What's New in v2.0

### 1. Dual-Path Checkout System
- **Traditional Online Order**: Customers can place orders directly on the website. Generates an instant Order ID (`EITOH-XXXX-YYYY`), saves to the local database, creates a printable invoice receipt, and enables real-time progress tracking.
- **Instant WhatsApp Dispatch**: Formats and transmits a structured, itemized receipt directly to the studio's WhatsApp number, while simultaneously registering the order in the CMS pipeline.
- **Promo Codes & Coupons**: Built-in coupon validator (e.g. `EITOHFIRST` for 10% off) with instant discount calculation and threshold checks.

### 2. Interactive 3D Print Cost Estimator
- Real-time estimation engine factoring in Length, Width, Height, Material (Silk PLA, Matte PLA+, PETG, TPU, ABS, Resin), Infill percentage, and Layer Precision.
- Instantly estimates model volume (cm³), weight in grams, print duration in hours, and total price in BDT (৳).
- One-click actions to order via WhatsApp with pre-filled specs or save as a custom quote.

### 3. Customer Order Tracker & Receipts
- **Visual Order Timeline**: Five-step progress pipeline (*Order Placed → Confirmed → Printing → Shipped → Delivered*).
- **Printable Invoices**: Clean, printable invoice receipts formatted for thermal or A4 printing with business branding, customer details, and item breakdowns.

### 4. Comprehensive Admin CMS Suite (`admin.html`)
- **Orders Hub**: Manage orders across all channels. Filter by status, search by phone or Order ID, update production stages, print manufacturing invoices, or click to WhatsApp the customer.
- **Custom Quotes Tab**: Follow up on customer 3D print estimator inquiries.
- **Coupons Management**: Issue percentage or fixed-amount promo codes with minimum spend requirements.
- **Store Analytics**: Live KPIs for Gross Revenue, Average Order Value (AOV), sales channel conversion (Online vs WhatsApp), and top-selling creations.
- **Storage Quota Health Meter**: Visual progress bar tracking browser `localStorage` usage out of 5MB.

### 5. Architectural & Security Hardening
- **XSS Prevention (SEC-01)**: All dynamic content interpolated through entity-sanitizing primitives (`EiTohUtils.escapeHTML`).
- **Cryptographic PIN Security (SEC-02)**: Admin authentication utilizes **SHA-256** hashing via the Web Crypto API (`crypto.subtle`), with automatic migration for legacy plaintext PINs.
- **HTML5 Canvas Compression (SEC-03)**: Uploaded product photos are automatically compressed to ~100KB JPEG using an offscreen canvas, preventing storage exhaustion.
- **Accessibility & Focus Trapping**: ARIA live regions for screen readers, keyboard-accessible dialogs with focus trapping (`EiTohUtils.trapFocus`), and full Dark / Light theme toggle.

---

## 📁 Project Structure

```
Eitoh Catalogue/
├── index.html            # Customer storefront, catalog, 3D estimator, tracker & checkout
├── admin.html            # CMS dashboard, Orders Hub, Quotes, Coupons & Analytics
├── css/
│   ├── style.css         # Mineral & Obsidian editorial design system, dark mode & components
│   └── admin.css         # Admin CMS styles, status badges, metrics cards & dropzone
├── js/
│   ├── utils.js          # Security primitives (XSS escape, SHA-256 PIN hash, Canvas compress, a11y)
│   ├── data.js           # StorageManager v2.0 (Orders, Coupons, Quotes, Analytics, Schema validation)
│   ├── app.js            # Customer storefront controller (Dual checkout, Estimator, Tracker, Wishlist)
│   └── admin.js          # Admin CMS controller (Orders pipeline, Coupons, Quotes, Analytics, Image uploader)
├── assets/
│   ├── logo.jpg          # EiToh studio logo
│   └── images/           # Sample high-resolution 3D print photography
└── README.md             # Documentation
```

---

## 🚀 Getting Started

No build step or Node environment required! Simply open `index.html` in any modern web browser or serve via any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node http-server or npx serve
npx serve .
```

- Storefront: `http://localhost:8000/index.html`
- Admin CMS: `http://localhost:8000/admin.html` (Default PIN: `1234`)
