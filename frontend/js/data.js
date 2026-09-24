/**
 * EiToh (এইতো) - Centralized Data & Storage Manager
 * Handles local persistence, seed data loading, JSON imports/exports, and cart operations.
 */

const DEFAULT_STORE_DATA = {
  settings: {
    storeName: "EiToh | এইতো",
    tagline: "Custom 3D Printing, Prototyping & Maker Crafts",
    whatsappNumber: "8801777547605",
    currency: "৳",
    currencyPlacement: "prefix", // "prefix" (৳500) or "suffix" (500৳)
    insideDelivery: 70,
    outsideDelivery: 130,
    pickupAvailable: true,
    pickupAddress: "Mirpur DOHS, Dhaka, Bangladesh",
    freeDeliveryThreshold: 2500,
    announcement: "✨ Custom 3D Printing & Lithophanes available! Message us on WhatsApp for bespoke orders.",
    adminPin: "1234" // Default admin PIN, easily changeable in CMS
  },
  categories: [
    { id: "all", name: "All Creations", icon: "fa-cubes", badge: "All" },
    { id: "articulated", name: "Articulated & Dragons", icon: "fa-dragon", badge: "Popular" },
    { id: "desk", name: "Desk & Gaming Setup", icon: "fa-desktop", badge: "Setup" },
    { id: "decor", name: "Home Decor & Vases", icon: "fa-spa", badge: "Decor" },
    { id: "lamps", name: "Lithophane & Lamps", icon: "fa-lightbulb", badge: "Gift" },
    { id: "fidget", name: "Fidgets & Mechanical", icon: "fa-gears", badge: "Play" }
  ],
  products: [
    {
      id: "eitoh-001",
      title: "Flexible Articulated Emerald Dragon",
      banglaTitle: "ফ্লেক্সিবল আর্টিকুলেটেড ড্রাগন",
      category: "articulated",
      price: 850,
      originalPrice: 1100,
      images: ["assets/images/articulated_dragon.jpg"],
      shortDescription: "Hyper-flexible multi-segment dragon printed with high-grade silk PLA.",
      description: "Experience fluid, mesmerizing movement with our signature Articulated Emerald Dragon. Every joint is printed-in-place with 0.16mm precision for smooth flexibility and sharp spine details.",
      tags: ["Silk PLA", "Articulated", "Green", "Bestseller"],
      stockStatus: "in_stock",
      featured: true,
      specs: {
        "material": "High-Grade Silk PLA",
        "length": "45 cm (17.7 inches)",
        "weight": "160g",
        "printTime": "14 Hours",
        "infill": "20% Gyroid"
      },
      colors: ["Emerald Green", "Silk Gold", "Galaxy Black", "Ruby Red"],
      rating: 4.9,
      reviewsCount: 38
    }
  ],
  orders: [],
  customQuotes: [],
  coupons: [
    {
      id: 'coupon-default-1',
      code: 'EITOHFIRST',
      type: 'percentage',
      value: 10,
      minSpend: 500,
      active: true,
      description: '10% off your first order (min ৳500)',
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'coupon-default-2',
      code: 'FREESHIP',
      type: 'shipping',
      value: 0,
      minSpend: 0,
      active: true,
      description: 'Free delivery on any order',
      createdAt: '2026-01-01T00:00:00Z'
    }
  ]
};

const STORAGE_KEY = 'eitoh_catalogue_data_v1';
const CART_STORAGE_KEY = 'eitoh_cart_v1';

class StorageManager {
  /**
   * Initializes store data from localStorage or fallback seed data
   */
  static getStoreData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.products && parsed.settings) {
          // If stored has older placeholder number, update it to the official number
          if (parsed.settings.whatsappNumber === '8801712345678' || parsed.settings.whatsappNumber === '8801700000000') {
            parsed.settings.whatsappNumber = '8801777547605';
            this.saveStoreData(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse localStorage, loading defaults:', e);
    }
    // Initialize with default
    this.saveStoreData(DEFAULT_STORE_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_STORE_DATA));
  }

  /**
   * Saves the entire state to localStorage and fires a custom event
   */
  static saveStoreData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('eitoh_data_updated', { detail: data }));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
      if (e.name === 'QuotaExceededError') {
        alert('Storage quota exceeded! Try using image URLs instead of very large image files.');
      }
    }
  }

  // =================== PRODUCT METHODS ===================
  static getProducts() {
    const data = this.getStoreData();
    return data.products || [];
  }

  static getProductById(id) {
    const products = this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  static addProduct(product) {
    const data = this.getStoreData();
    if (!product.id) {
      product.id = 'eitoh-' + Date.now().toString(36);
    }
    data.products.unshift(product);
    this.saveStoreData(data);
    return product;
  }

  static updateProduct(id, updatedProduct) {
    const data = this.getStoreData();
    const index = data.products.findIndex(p => p.id === id);
    if (index !== -1) {
      data.products[index] = { ...data.products[index], ...updatedProduct, id };
      this.saveStoreData(data);
      return true;
    }
    return false;
  }

  static deleteProduct(id) {
    const data = this.getStoreData();
    data.products = data.products.filter(p => p.id !== id);
    this.saveStoreData(data);
    return true;
  }

  // =================== CATEGORY METHODS ===================
  static getCategories() {
    const data = this.getStoreData();
    return data.categories || [];
  }

  static saveCategories(categories) {
    const data = this.getStoreData();
    data.categories = categories;
    this.saveStoreData(data);
  }

  // =================== SETTINGS METHODS ===================
  static getSettings() {
    const data = this.getStoreData();
    return data.settings || DEFAULT_STORE_DATA.settings;
  }

  static saveSettings(settings) {
    const data = this.getStoreData();
    data.settings = { ...data.settings, ...settings };
    this.saveStoreData(data);
  }

  // =================== BACKUP & SYNC ===================
  static exportJSON() {
    const data = this.getStoreData();
    return JSON.stringify(data, null, 2);
  }

  static importJSON(jsonString) {
    try {
      // SEC-03: Reject payloads exceeding 4MB to prevent storage quota issues
      if (jsonString.length > 4 * 1024 * 1024) {
        throw new Error('Import payload exceeds 4MB limit. Please reduce image data before importing.');
      }

      const data = JSON.parse(jsonString);

      // Schema validation: require products array and settings object
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid JSON structure. Must be a valid object.");
      }
      if (!Array.isArray(data.products)) {
        throw new Error("Missing or invalid 'products' array.");
      }
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error("Missing or invalid 'settings' object.");
      }

      // Validate each product has required fields
      for (let i = 0; i < data.products.length; i++) {
        const p = data.products[i];
        if (!p || typeof p !== 'object') {
          throw new Error(`Product at index ${i} is not a valid object.`);
        }
        if (!p.id || typeof p.id !== 'string') {
          throw new Error(`Product at index ${i} is missing a valid 'id' string.`);
        }
        if (!p.title || typeof p.title !== 'string') {
          throw new Error(`Product "${p.id}" is missing a valid 'title' string.`);
        }
        if (p.price === undefined || typeof p.price !== 'number' || p.price < 0) {
          throw new Error(`Product "${p.id}" has an invalid 'price'. Must be a non-negative number.`);
        }
      }

      // Ensure categories exist (fallback to defaults if missing)
      if (!Array.isArray(data.categories)) {
        data.categories = DEFAULT_STORE_DATA.categories;
      }

      this.saveStoreData(data);
      return { success: true, message: `Successfully imported ${data.products.length} products.` };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  static resetToDefaults() {
    this.saveStoreData(DEFAULT_STORE_DATA);
    return true;
  }

  // =================== CART MANAGEMENT ===================
  static getCart() {
    try {
      const cart = localStorage.getItem(CART_STORAGE_KEY);
      return cart ? JSON.parse(cart) : [];
    } catch (e) {
      return [];
    }
  }

  static saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('eitoh_cart_updated', { detail: cart }));
    } catch (e) {
      console.error('Failed to save cart:', e);
    }
  }

  static addToCart(productOrId, quantity = 1, optionsOrColor = {}) {
    let product;
    if (typeof productOrId === 'object' && productOrId !== null) {
      product = productOrId;
    } else {
      product = this.getProductById(productOrId);
    }
    if (!product) return null;

    const cart = this.getCart();
    let selectedColor = 'Standard';
    let customNote = '';
    if (typeof optionsOrColor === 'string') {
      selectedColor = optionsOrColor;
    } else if (typeof optionsOrColor === 'object' && optionsOrColor !== null) {
      selectedColor = optionsOrColor.color || (product.colors && product.colors[0]) || 'Standard';
      customNote = optionsOrColor.note || '';
    }

    const productId = product.id;
    const cartItemId = `${productId}__${selectedColor}__${encodeURIComponent(customNote.slice(0, 20))}`;

    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    const itemImg = product.image || (product.images && product.images[0]) || 'assets/logo.jpg';

    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        cartItemId,
        productId: product.id,
        id: product.id,
        title: product.title,
        banglaTitle: product.banglaTitle || '',
        price: product.price,
        image: itemImg,
        quantity: quantity,
        selectedColor: selectedColor,
        customNote: customNote,
        category: product.category
      });
    }

    this.saveCart(cart);
    return cart;
  }

  static updateCartItemQuantity(cartItemId, newQty) {
    let cart = this.getCart();
    if (newQty <= 0) {
      cart = cart.filter(item => item.cartItemId !== cartItemId);
    } else {
      const item = cart.find(item => item.cartItemId === cartItemId);
      if (item) item.quantity = newQty;
    }
    this.saveCart(cart);
    return cart;
  }

  static updateCartQuantity(cartItemId, newQty) {
    return this.updateCartItemQuantity(cartItemId, newQty);
  }

  static removeFromCart(cartItemId) {
    let cart = this.getCart();
    cart = cart.filter(item => item.cartItemId !== cartItemId);
    this.saveCart(cart);
    return cart;
  }

  static clearCart() {
    this.saveCart([]);
  }

  // =================== UTILITIES ===================
  static formatPrice(amount) {
    const settings = this.getSettings();
    const currency = settings.currency || '৳';
    const num = Number(amount || 0).toLocaleString();
    return settings.currencyPlacement === 'suffix' ? `${num} ${currency}` : `${currency} ${num}`;
  }

  // =================== ORDER MANAGEMENT ===================
  static getOrders() {
    const data = this.getStoreData();
    return data.orders || [];
  }

  static getOrderById(orderId) {
    return this.getOrders().find(o => o.id === orderId) || null;
  }

  static getOrdersByPhone(phone) {
    const clean = String(phone || '').replace(/[^0-9]/g, '');
    return this.getOrders().filter(o => {
      const orderPhone = String(o.customer?.phone || '').replace(/[^0-9]/g, '');
      return orderPhone === clean;
    });
  }

  static async syncWithBackend() {
    // 1. Live MySQL REST API
    if (window.EiTohAPI && window.EiTohAPI.products) {
      try {
        const res = await window.EiTohAPI.products.getAll();
        if (res && res.products && res.products.length > 0) {
          const data = this.getStoreData();
          data.products = res.products;
          this.saveStoreData(data);
          return res.products;
        }
      } catch (err) {
        // Fallback to static products.json
      }
    }

    // 2. Fallback to static products.json
    try {
      const res = await fetch('data/products.json');
      if (res.ok) {
        const json = await res.json();
        if (json && json.products && json.products.length > 0) {
          const data = this.getStoreData();
          data.products = json.products;
          if (json.categories) data.categories = json.categories;
          this.saveStoreData(data);
          return json.products;
        }
      }
    } catch (e) {
      console.warn('Fallback products.json error:', e);
    }
    return this.getProducts();
  }

  static saveOrder(orderData) {
    const data = this.getStoreData();
    if (!data.orders) data.orders = [];
    // Ensure order has an ID and timestamp
    if (!orderData.id) {
      orderData.id = window.EiTohUtils ? window.EiTohUtils.generateOrderId() : `EIT-${Date.now()}`;
    }
    if (!orderData.date) {
      orderData.date = new Date().toISOString();
    }
    if (!orderData.status) {
      orderData.status = 'confirmed';
    }
    data.orders.unshift(orderData);
    this.saveStoreData(data);

    // Asynchronously synchronize with MySQL backend database
    if (window.EiTohAPI && window.EiTohAPI.orders) {
      const apiPayload = {
        customerName: orderData.customer?.name || 'Customer',
        customerPhone: orderData.customer?.phone || '01700000000',
        customerEmail: orderData.customer?.email || null,
        deliveryAddress: orderData.customer?.address || 'Dhaka',
        deliveryCity: orderData.customer?.city || 'Dhaka',
        deliveryDistrict: orderData.customer?.district || 'Dhaka',
        deliveryZone: orderData.delivery?.zone || (orderData.delivery?.area === 'outside' ? 'outside_dhaka' : 'inside_dhaka'),
        paymentMethod: orderData.payment?.method === 'cod' ? 'cash_on_delivery' : (orderData.payment?.method || 'cash_on_delivery'),
        trxId: orderData.payment?.trxId || orderData.trxId || null,
        items: (orderData.items || []).map(it => ({
          productId: it.id || it.productId,
          title: it.title,
          quantity: it.quantity || 1,
          price: it.price || 0,
          selectedColor: it.color || it.selectedColor || null
        })),
        couponCode: orderData.couponCode || null,
        orderNotes: orderData.notes || orderData.customer?.notes || null
      };

      window.EiTohAPI.orders.create(apiPayload).then(res => {
        if (res.orderNumber) {
          orderData.orderNumber = res.orderNumber;
          orderData.id = res.orderNumber;
          this.saveStoreData(data);
        }
      }).catch(err => {
        console.warn('MySQL order sync note:', err.message);
      });
    }

    return orderData;
  }

  static getOrder(orderId) {
    return this.getOrderById(orderId);
  }

  static findOrdersByCustomer(query) {
    if (!query) return [];
    const q = String(query).toLowerCase().trim();
    const cleanQ = q.replace(/[^0-9]/g, '');
    return this.getOrders().filter(o => {
      const idMatch = o.id && o.id.toLowerCase().includes(q);
      const nameMatch = o.customer?.name && o.customer.name.toLowerCase().includes(q);
      const cleanPhone = String(o.customer?.phone || '').replace(/[^0-9]/g, '');
      const phoneMatch = cleanQ.length >= 3 && cleanPhone.includes(cleanQ);
      return idMatch || nameMatch || phoneMatch;
    });
  }

  static updateOrderStatus(orderId, newStatus, notes = '') {
    const validStatuses = ['pending', 'confirmed', 'in_production', 'printing', 'shipped', 'delivered', 'completed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) return false;
    const data = this.getStoreData();
    if (!data.orders) return false;
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return false;
    order.status = newStatus;
    if (notes) order.adminNotes = notes;
    order.lastUpdated = new Date().toISOString();
    this.saveStoreData(data);
    return order;
  }

  static deleteOrder(orderId) {
    const data = this.getStoreData();
    if (!data.orders) return false;
    data.orders = data.orders.filter(o => o.id !== orderId);
    this.saveStoreData(data);
    return true;
  }

  // =================== COUPON MANAGEMENT ===================
  static getCoupons() {
    const data = this.getStoreData();
    return data.coupons || [];
  }

  static saveCoupon(coupon) {
    const data = this.getStoreData();
    if (!data.coupons) data.coupons = [];
    const idx = data.coupons.findIndex(c => c.id === coupon.id || (c.code && coupon.code && c.code.toUpperCase() === coupon.code.toUpperCase()));
    if (idx > -1) {
      data.coupons[idx] = { ...data.coupons[idx], ...coupon };
    } else {
      if (!coupon.id) coupon.id = 'coupon-' + Date.now().toString(36);
      coupon.createdAt = new Date().toISOString();
      data.coupons.push(coupon);
    }
    this.saveStoreData(data);
    return coupon;
  }

  static addCoupon(coupon) {
    return this.saveCoupon(coupon);
  }

  static deleteCoupon(couponId) {
    const data = this.getStoreData();
    if (!data.coupons) return false;
    data.coupons = data.coupons.filter(c => c.id !== couponId);
    this.saveStoreData(data);
    return true;
  }

  static toggleCoupon(couponId) {
    const data = this.getStoreData();
    if (!data.coupons) return false;
    const coupon = data.coupons.find(c => c.id === couponId);
    if (!coupon) return false;
    coupon.active = !coupon.active;
    this.saveStoreData(data);
    return coupon.active;
  }

  /**
   * Validates a coupon code against the current subtotal.
   * @param {string} code - The coupon code entered by the customer
   * @param {number} subtotal - The order subtotal before discount
   * @returns {{ valid: boolean, discount: number, message: string, type: string, coupon: Object }}
   */
  static validateCoupon(code, subtotal) {
    const coupons = this.getCoupons();
    const coupon = coupons.find(c => 
      c.code && c.code.toUpperCase() === String(code).toUpperCase() && c.active !== false
    );

    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid or inactive promo code.', type: '', coupon: null };
    }

    // Check minimum spend
    if (coupon.minSpend && subtotal < coupon.minSpend) {
      return { valid: false, discount: 0, message: `Minimum spend of ${this.formatPrice(coupon.minSpend)} required.`, type: '', coupon: null };
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false, discount: 0, message: 'This promo code has expired.', type: '', coupon: null };
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = Math.round(subtotal * (coupon.value / 100));
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    return { 
      valid: true, 
      discount, 
      message: `Coupon "${coupon.code}" applied! You save ${this.formatPrice(discount)}.`, 
      type: coupon.type || 'percentage',
      coupon
    };
  }

  // =================== CUSTOM QUOTE MANAGEMENT ===================
  static getQuotes() {
    const data = this.getStoreData();
    return data.customQuotes || [];
  }

  static saveCustomQuote(quoteData) {
    const data = this.getStoreData();
    if (!data.customQuotes) data.customQuotes = [];
    if (!quoteData.id) {
      quoteData.id = 'quote-' + Date.now().toString(36);
    }
    quoteData.createdAt = quoteData.createdAt || new Date().toISOString();
    quoteData.status = quoteData.status || 'pending';
    data.customQuotes.unshift(quoteData);
    this.saveStoreData(data);
    return quoteData;
  }

  static deleteQuote(quoteId) {
    const data = this.getStoreData();
    if (!data.customQuotes) return false;
    data.customQuotes = data.customQuotes.filter(q => q.id !== quoteId);
    this.saveStoreData(data);
    return true;
  }

  // =================== WISHLIST ===================
  static getWishlist() {
    try {
      const wl = localStorage.getItem('eitoh_wishlist_v1');
      return wl ? JSON.parse(wl) : [];
    } catch (e) {
      return [];
    }
  }

  static toggleWishlist(productId) {
    let wl = this.getWishlist();
    const index = wl.indexOf(productId);
    let isAdded = false;
    if (index > -1) {
      wl.splice(index, 1);
      isAdded = false;
    } else {
      wl.push(productId);
      isAdded = true;
    }
    try {
      localStorage.setItem('eitoh_wishlist_v1', JSON.stringify(wl));
    } catch (e) {
      console.error('Failed to save wishlist:', e);
    }
    return isAdded;
  }

  static isInWishlist(productId) {
    return this.getWishlist().includes(productId);
  }

  // =================== THEME PERSISTENCE ===================
  static getTheme() {
    return localStorage.getItem('eitoh_theme') || 'light';
  }

  static setTheme(mode) {
    localStorage.setItem('eitoh_theme', mode);
    document.documentElement.setAttribute('data-theme', mode);
  }

  static getThemeMode() {
    return this.getTheme();
  }

  static setThemeMode(mode) {
    this.setTheme(mode);
  }

  // =================== 3D PRINT COST ESTIMATOR ENGINE ===================
  static getMaterials() {
    return [
      { id: 'silk_pla', name: 'Silk PLA', density: 1.24, pricePerGram: 3.5, finish: 'Iridescent Sheen' },
      { id: 'matte_pla', name: 'Matte PLA+', density: 1.24, pricePerGram: 3.2, finish: 'Satin Matte' },
      { id: 'petg', name: 'PETG', density: 1.27, pricePerGram: 3.8, finish: 'Smooth & Tough' },
      { id: 'tpu_flex', name: 'TPU Flexible', density: 1.21, pricePerGram: 5.0, finish: 'Rubber-like Flex' },
      { id: 'abs', name: 'ABS', density: 1.04, pricePerGram: 3.5, finish: 'Post-Processable' },
      { id: 'resin', name: 'Standard Resin', density: 1.10, pricePerGram: 6.5, finish: 'Ultra Fine Detail' }
    ];
  }

  static calculate3DPrintEstimate(params = {}) {
    const l = parseFloat(params.length || params.lengthCm || 10);
    const w = parseFloat(params.width || params.widthCm || 8);
    const h = parseFloat(params.height || params.heightCm || 12);
    const matId = params.material || params.materialId || 'silk_pla';
    const infill = params.infill !== undefined ? parseInt(params.infill, 10) : 20;
    const quality = params.quality || 'standard';

    const materials = this.getMaterials();
    const material = materials.find(m => m.id === matId) || materials[0];

    // Bounding Box & Infill calculation
    const boundingVolume = l * w * h;
    const infillFactor = infill / 100;
    // Model volume estimation: 18% shell + infill% of remaining 82%
    const effectiveVolume = Math.max(5, boundingVolume * (0.18 + 0.82 * infillFactor * 0.4));

    // Weight in grams
    const weightGrams = Math.max(10, Math.round(effectiveVolume * material.density));

    // Quality multiplier for print time
    const qualityMultiplier = quality === 'high' ? 1.6 : (quality === 'draft' ? 0.7 : 1.0);
    // Extrusion rate ~15g/hour
    const printTimeHours = Math.max(1, Math.round((weightGrams / 14) * qualityMultiplier * 10) / 10);

    // Cost model in BDT (৳)
    const filamentCost = weightGrams * material.pricePerGram;
    const machineTimeCost = printTimeHours * 35; // ৳35/hour machine time + electricity
    const basePrepFee = 80; // Slicing & prep
    const rawPrice = filamentCost + machineTimeCost + basePrepFee;
    const finalPrice = Math.max(250, Math.round(rawPrice / 10) * 10); // Round to nearest ৳10, minimum ৳250

    return {
      volumeCm3: Math.round(effectiveVolume * 10) / 10,
      weightGrams,
      printTimeHours,
      price: finalPrice,
      material: material.name
    };
  }

  static calculatePrintEstimate(params) {
    return this.calculate3DPrintEstimate(params);
  }

  // =================== ANALYTICS SUMMARY ===================
  static getAnalyticsSummary() {
    const orders = this.getOrders();
    const completed = orders.filter(o => o.status !== 'cancelled');
    const totalRev = completed.reduce((sum, o) => sum + (o.total || 0), 0);
    const aov = completed.length > 0 ? Math.round(totalRev / completed.length) : 0;

    const channels = { online: 0, whatsapp: 0 };
    const deliveryAreas = { inside: 0, outside: 0, pickup: 0 };
    const productStats = {};

    orders.forEach(o => {
      const ch = o.channel === 'whatsapp' ? 'whatsapp' : 'online';
      channels[ch] = (channels[ch] || 0) + 1;

      const area = o.customer?.deliveryArea || 'inside';
      deliveryAreas[area] = (deliveryAreas[area] || 0) + 1;

      (o.items || []).forEach(it => {
        const title = it.title || 'Custom 3D Print';
        if (!productStats[title]) productStats[title] = { title, quantity: 0, revenue: 0 };
        productStats[title].quantity += (it.quantity || 1);
        productStats[title].revenue += (it.price || 0) * (it.quantity || 1);
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalOrders: orders.length,
      grossRevenue: totalRev,
      aov,
      channels,
      deliveryAreas,
      topProducts
    };
  }

  static getAnalytics() {
    return this.getAnalyticsSummary();
  }

  // =================== STORAGE USAGE ===================
  static getStorageUsageKB() {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val) totalBytes += key.length + val.length;
        }
      }
    } catch (e) {
      console.warn('Storage usage check error:', e);
    }
    return Math.round(totalBytes / 1024);
  }
}

// Make globally accessible
window.StorageManager = StorageManager;
window.DEFAULT_STORE_DATA = DEFAULT_STORE_DATA;

