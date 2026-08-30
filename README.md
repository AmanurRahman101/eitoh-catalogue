# EiToh (এইতো) — 3D Printing & Maker Catalog with CMS & WhatsApp Checkout

🌐 **Live Website**: [https://amanurrahman101.github.io/eitoh-catalogue/](https://amanurrahman101.github.io/eitoh-catalogue/)  
📦 **GitHub Repository**: [https://github.com/AmanurRahman101/eitoh-catalogue](https://github.com/AmanurRahman101/eitoh-catalogue)  
⚙️ **Admin CMS**: [https://amanurrahman101.github.io/eitoh-catalogue/admin.html](https://amanurrahman101.github.io/eitoh-catalogue/admin.html) (Default PIN: `1234`)

A modern, fast, and responsive Product Catalog web application with an integrated Content Management System (CMS) and WhatsApp direct-order checkout, built with pure **HTML5, Vanilla CSS3, and JavaScript (ES6+)**.

---

## 🌟 Key Features

1. **Stunning Customer Catalog (`index.html`)**:
   - **EiToh Branding**: Features custom logo, color schemes (Deep Slate Cyan `#1b536b`, Filament Orange `#ea580c`), and Bengali typography (`Hind Siliguri`).
   - **Multi-Level Category & Filter System**:
     - Categories: Articulated & Dragons, Desk Accessories, Home Decor & Vases, Lithophane & Lamps, Fidgets & Mechanicals.
     - Dynamic Tag Chips: Bestseller, Silk PLA, Custom Photo, In Stock Only, etc.
     - Live instant search with autocomplete matching English titles, Bengali names, and descriptions.
     - Price and rating sorting (Low to High, High to Low, Top Rated, Newest, Featured).
   - **Interactive Product Cards & Quick View Modal**:
     - High-res image galleries, specs table (Material, Dimensions, Print Time, Infill), color/finish selection, and stock status indicators.

2. **Smart Shopping Cart & WhatsApp Checkout**:
   - Slide-out Cart Drawer with quantity steppers and variant indicators.
   - Dynamic delivery charge calculation (Inside Dhaka ৳70, Outside Dhaka ৳130, Pickup Free, Free Shipping above ৳2500).
   - **WhatsApp Checkout**: One-click formatting compiles the full itemized order, customer details, and total into a pre-filled WhatsApp message ready to send to the store owner's WhatsApp number.

3. **Built-in CMS & Admin Dashboard (`admin.html`)**:
   - **Protected PIN Access**: Secure PIN lock (Default: `1234`).
   - **Product Manager**: Add, edit, duplicate, or delete products.
   - **Multi-Photo Upload**: Supports drag-and-drop local image file upload (auto Base64 encoding) and image URLs.
   - **Category Manager**: Add custom categories with icons and badges.
   - **Store & WhatsApp Configuration**: Change your WhatsApp number, currency symbol, delivery rates, and top banner notice anytime.
   - **Data Export / Import & AI Agent Sync**:
     - One-click "Copy JSON for AI Agent" to instantly sync browser edits back to the codebase.
     - Download and restore `products.json` backups.

---

## 📁 Project Structure

```
Eitoh Catalogue/
├── index.html            # Customer storefront & catalog
├── admin.html            # Store CMS & admin management dashboard
├── css/
│   ├── style.css         # Main design system, glassmorphism & responsive styles
│   └── admin.css         # CMS dashboard, data tables, and dropzone styles
├── js/
│   ├── data.js           # Seed data, storage layer & LocalStorage persistence
│   ├── app.js            # Customer catalog, filters, modal & WhatsApp cart logic
│   └── admin.js          # Admin CMS logic, photo uploader & settings manager
├── data/
│   └── products.json     # Clean JSON database of products and settings
├── assets/
│   ├── logo.jpg          # EiToh brand logo
│   └── images/           # High quality sample 3D print product photography
└── README.md             # Documentation
```

---

## 🚀 How to Run Locally

You can run this project simply by opening `index.html` in any web browser, or starting a local lightweight static server:

```powershell
# Using Python
python -m http.server 8000

# Or using Node.js npx serve
npx serve .
```

Then visit:
- **Storefront**: `http://localhost:8000/index.html`
- **Admin CMS**: `http://localhost:8000/admin.html` (Default PIN: `1234`)

---

## 🤖 Updating the Catalog with AI Agents

Because this project uses a clean modular structure and standard JSON format:
- To add or modify products directly through an AI agent, ask the agent to edit `data/products.json` or `js/data.js`.
- If you edit products in the web CMS (`admin.html`), go to the **Export & AI Sync** tab, click **Copy Full JSON to Clipboard**, and provide it to the agent to permanently update your files!
