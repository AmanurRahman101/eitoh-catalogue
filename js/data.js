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
      description: "Experience fluid, mesmerizing movement with our signature Articulated Emerald Dragon. Every joint is printed-in-place with 0.16mm precision for smooth flexibility and sharp spine details. Perfect as a desk companion or collector display piece.",
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
      colors: ["Emerald Green", "Silk Gold", "Galaxy Black", "Ruby Red", "Rainbow Silk"],
      rating: 4.9,
      reviewsCount: 38
    },
    {
      id: "eitoh-002",
      title: "Geometric Low-Poly Modern Vase",
      banglaTitle: "মডার্ন জিওমেট্রিক পলিগন ফুলদানি",
      category: "decor",
      price: 650,
      originalPrice: 850,
      images: ["assets/images/geometric_vase.jpg"],
      shortDescription: "Minimalist architectural low-poly vase for dry flowers and aesthetic spaces.",
      description: "Add modern architectural elegance to your workspace or living room with our faceted polygon vase. Designed with waterproof interior coating option and clean geometric reflections.",
      tags: ["Low-Poly", "Matte Slate", "Home Decor", "Minimalist"],
      stockStatus: "in_stock",
      featured: true,
      specs: {
        "material": "Matte PLA+",
        "dimensions": "10cm x 10cm x 22cm",
        "weight": "190g",
        "finish": "Satin Matte Smooth",
        "waterproof": "Dry flora recommended / Waterproof liner available"
      },
      colors: ["Slate Charcoal", "Nordic White", "Terracotta Sand", "Marble Grey"],
      rating: 4.8,
      reviewsCount: 24
    },
    {
      id: "eitoh-003",
      title: "Cyberpunk Ergonomic Headphone Stand",
      banglaTitle: "সাইবারপাংক হেডফোন স্ট্যান্ড",
      category: "desk",
      price: 950,
      originalPrice: 1250,
      images: ["assets/images/headphone_stand.jpg"],
      shortDescription: "Heavy-duty headset cradle with integrated cable channel and anti-slip feet.",
      description: "Engineered for gamers and audiophiles. Features a wide curved cradle that distributes headband weight without leaving indentations, plus a weighted base and back cable organizer hook.",
      tags: ["Desk Setup", "Gaming", "PETG", "Cable Management"],
      stockStatus: "in_stock",
      featured: true,
      specs: {
        "material": "Reinforced Carbon PETG",
        "height": "26 cm",
        "baseWidth": "14 cm",
        "loadCapacity": "Up to 3kg",
        "cableClip": "Built-in"
      },
      colors: ["Stealth Black", "Cyber Cyan", "Gunmetal Grey", "Arctic White"],
      rating: 5.0,
      reviewsCount: 42
    },
    {
      id: "eitoh-004",
      title: "Custom 3D Lithophane Memory Night Lamp",
      banglaTitle: "কাস্টম লিথোফেন ফটো নাইট ল্যাম্প",
      category: "lamps",
      price: 1450,
      originalPrice: 1800,
      images: ["assets/images/lithophane_lamp.jpg"],
      shortDescription: "Turn your favorite photo into an illuminated 3D relief night lamp with warm LED base.",
      description: "Send us your memorable photo on WhatsApp after ordering, and we will 3D sculpt it into a curved high-density lithophane. When switched on, the light reveals rich shades and lifelike photo details. Includes solid base, warm LED, and USB cable.",
      tags: ["Custom Photo", "Lithophane", "Gift", "LED Lamp"],
      stockStatus: "made_to_order",
      featured: true,
      specs: {
        "material": "High-Detail White PLA + Wood Base",
        "curvedArc": "16cm x 12cm",
        "lightSource": "Warm White USB LED (5V)",
        "turnaround": "24-48 Hours"
      },
      colors: ["Warm White Base", "Dark Walnut Finish", "Natural Maple"],
      rating: 5.0,
      reviewsCount: 57
    },
    {
      id: "eitoh-005",
      title: "Precision Interlocking Gear Fidget Cube",
      banglaTitle: "মেকানিক্যাল গিয়ার ফিজেট কিউব",
      category: "fidget",
      price: 480,
      originalPrice: 650,
      images: ["assets/images/fidget_cube.jpg"],
      shortDescription: "Smooth-spinning mechanical gears on all 6 faces for stress relief and focus.",
      description: "An addictive desk fidget gadget with synchronized planetary gear systems. Each side spins smoothly with satisfying tactile feedback. Printed in vibrant multi-color filament.",
      tags: ["Fidget", "Mechanical", "Multi-Color", "Desk Toy"],
      stockStatus: "in_stock",
      featured: false,
      specs: {
        "material": "Multi-Color PLA / PETG Gears",
        "cubeSize": "60mm x 60mm x 60mm",
        "bearings": "High Precision Steel Pins",
        "weight": "115g"
      },
      colors: ["Multi-Color Cyber", "Black & Gold", "Pastel Rainbow", "Mono Slate"],
      rating: 4.7,
      reviewsCount: 19
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
      const data = JSON.parse(jsonString);
      if (!data.products || !data.settings) {
        throw new Error("Invalid structure. Must have 'products' and 'settings'.");
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

  static addToCart(productId, quantity = 1, options = {}) {
    const product = this.getProductById(productId);
    if (!product) return null;

    const cart = this.getCart();
    // Unique key considering selected color/options
    const selectedColor = options.color || (product.colors && product.colors[0]) || 'Standard';
    const customNote = options.note || '';
    const cartItemId = `${productId}__${selectedColor}__${encodeURIComponent(customNote.slice(0, 20))}`;

    const existingIndex = cart.findIndex(item => item.cartItemId === cartItemId);
    if (existingIndex > -1) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        cartItemId,
        productId: product.id,
        title: product.title,
        banglaTitle: product.banglaTitle || '',
        price: product.price,
        image: product.images && product.images[0] ? product.images[0] : 'assets/logo.jpg',
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
}

// Make globally accessible
window.StorageManager = StorageManager;
window.DEFAULT_STORE_DATA = DEFAULT_STORE_DATA;
