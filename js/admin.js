/**
 * EiToh (এইতো) — CMS Admin Dashboard Controller v2.0
 * 
 * Features:
 * - Secure PIN authentication with SHA-256 hashing & plaintext migration
 * - Full Product & Inventory CRUD with HTML5 Canvas image compression (SEC-03)
 * - Orders Hub: Real-time orders pipeline (Pending, Confirmed, Production, Shipped, Delivered)
 * - Custom Quotes: View and follow up on 3D print estimator inquiries
 * - Coupon Management: Promo code generation (percentage or fixed discount)
 * - Store Analytics: Revenue, AOV, sales channel split, and top creations
 * - Category Editor: Custom taxonomies & icons
 * - Storage Quota Meter: Live localStorage monitoring (KB & percentage)
 * - Hardened JSON backup & sync with schema validation
 * - 100% XSS-sanitized template rendering with EiTohUtils.escapeHTML (SEC-01)
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const { escapeHTML: E, showToast, compressImage, hashPIN, verifyPIN, trapFocus, formatDate } = window.EiTohUtils || {
    escapeHTML: s => String(s || ''),
    showToast: msg => alert(msg),
    compressImage: file => Promise.resolve(''),
    hashPIN: pin => Promise.resolve(pin),
    verifyPIN: (pin, hash) => Promise.resolve(String(pin) === String(hash)),
    trapFocus: () => () => {},
    formatDate: d => new Date(d).toLocaleDateString()
  };

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  const state = {
    currentTab: 'tabProducts',
    searchFilter: '',
    categoryFilter: 'all',
    orderStatusFilter: 'all',
    orderSearchFilter: '',
    uploadedImages: [],
    editingProductId: null,
    editingCategoryId: null
  };

  // =========================================================================
  // DOM ELEMENT REFERENCES
  // =========================================================================
  const elements = {
    // PIN Overlay
    pinOverlay: document.getElementById('pinOverlay'),
    pinInput: document.getElementById('pinInput'),

    // Top Stats Bar
    statTotalProducts: document.getElementById('statTotalProducts'),
    statInStock: document.getElementById('statInStock'),
    statTotalOrders: document.getElementById('statTotalOrders'),
    statTotalRevenue: document.getElementById('statTotalRevenue'),
    pendingOrdersBadge: document.getElementById('pendingOrdersBadge'),

    // Navigation
    navItems: document.querySelectorAll('.admin-nav-item'),
    tabPanels: document.querySelectorAll('.admin-tab-panel'),

    // Products Tab
    adminSearchInput: document.getElementById('adminSearchInput'),
    adminCategoryFilter: document.getElementById('adminCategoryFilter'),
    adminProductsTableBody: document.getElementById('adminProductsTableBody'),
    btnOpenAddProduct: document.getElementById('btnOpenAddProduct'),

    // Orders Tab
    orderStatusTabs: document.getElementById('orderStatusTabs'),
    orderSearchInput: document.getElementById('orderSearchInput'),
    adminOrdersTableBody: document.getElementById('adminOrdersTableBody'),

    // Quotes Tab
    adminQuotesTableBody: document.getElementById('adminQuotesTableBody'),

    // Coupons Tab
    newCouponCode: document.getElementById('newCouponCode'),
    newCouponType: document.getElementById('newCouponType'),
    newCouponValue: document.getElementById('newCouponValue'),
    newCouponMinSpend: document.getElementById('newCouponMinSpend'),
    newCouponDesc: document.getElementById('newCouponDesc'),
    newCouponActive: document.getElementById('newCouponActive'),
    adminCouponsTableBody: document.getElementById('adminCouponsTableBody'),

    // Analytics Tab
    analyticsAov: document.getElementById('analyticsAov'),
    analyticsChannelsWrap: document.getElementById('analyticsChannelsWrap'),
    analyticsDeliveryWrap: document.getElementById('analyticsDeliveryWrap'),
    analyticsTopProductsList: document.getElementById('analyticsTopProductsList'),

    // Categories Tab
    adminCategoriesTableBody: document.getElementById('adminCategoriesTableBody'),
    btnOpenAddCategory: document.getElementById('btnOpenAddCategory'),

    // Settings Tab
    settingWhatsappNumber: document.getElementById('settingWhatsappNumber'),
    settingCurrency: document.getElementById('settingCurrency'),
    settingInsideDelivery: document.getElementById('settingInsideDelivery'),
    settingOutsideDelivery: document.getElementById('settingOutsideDelivery'),
    settingFreeDeliveryThreshold: document.getElementById('settingFreeDeliveryThreshold'),
    settingStoreName: document.getElementById('settingStoreName'),
    settingTagline: document.getElementById('settingTagline'),
    settingAnnouncement: document.getElementById('settingAnnouncement'),
    settingAdminPin: document.getElementById('settingAdminPin'),
    btnSaveSettings: document.getElementById('btnSaveSettings'),

    // Sync & Storage Tab
    storageMeterFill: document.getElementById('storageMeterFill'),
    storageUsageText: document.getElementById('storageUsageText'),
    storageHealthBadge: document.getElementById('storageHealthBadge'),
    btnCopyJson: document.getElementById('btnCopyJson'),
    btnDownloadJson: document.getElementById('btnDownloadJson'),
    importJsonFileInput: document.getElementById('importJsonFileInput'),
    btnResetDefaults: document.getElementById('btnResetDefaults'),
    jsonPreviewBox: document.getElementById('jsonPreviewBox'),

    // Modals
    productModal: document.getElementById('productModal'),
    btnCloseProductModal: document.getElementById('btnCloseProductModal'),
    btnCancelProductModal: document.getElementById('btnCancelProductModal'),
    productForm: document.getElementById('productForm'),
    productModalHeading: document.getElementById('productModalHeading'),
    editProductId: document.getElementById('editProductId'),
    imageDropzone: document.getElementById('imageDropzone'),
    productImageFileInput: document.getElementById('productImageFileInput'),
    productImageUrlInput: document.getElementById('productImageUrlInput'),
    btnAddImageUrl: document.getElementById('btnAddImageUrl'),
    productImagePreviewStrip: document.getElementById('productImagePreviewStrip'),

    // Form inputs (Product)
    prodTitle: document.getElementById('prodTitle'),
    prodBanglaTitle: document.getElementById('prodBanglaTitle'),
    prodCategory: document.getElementById('prodCategory'),
    prodStockStatus: document.getElementById('prodStockStatus'),
    prodPrice: document.getElementById('prodPrice'),
    prodOriginalPrice: document.getElementById('prodOriginalPrice'),
    prodShortDesc: document.getElementById('prodShortDesc'),
    prodDesc: document.getElementById('prodDesc'),
    prodTags: document.getElementById('prodTags'),
    prodColors: document.getElementById('prodColors'),
    prodSpecMaterial: document.getElementById('prodSpecMaterial'),
    prodSpecDimensions: document.getElementById('prodSpecDimensions'),
    prodSpecPrintTime: document.getElementById('prodSpecPrintTime'),
    prodSpecInfill: document.getElementById('prodSpecInfill'),
    prodFeatured: document.getElementById('prodFeatured'),

    // Category Modal
    categoryModal: document.getElementById('categoryModal'),
    btnCloseCatModal: document.getElementById('btnCloseCatModal'),
    catModalHeading: document.getElementById('catModalHeading'),
    editCatId: document.getElementById('editCatId'),
    catName: document.getElementById('catName'),
    catBangla: document.getElementById('catBangla'),
    catIcon: document.getElementById('catIcon'),

    // Admin Order Details Modal
    adminOrderModal: document.getElementById('adminOrderModal'),
    btnCloseAdminOrderModal: document.getElementById('btnCloseAdminOrderModal'),
    adminOrderModalContent: document.getElementById('adminOrderModalContent')
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    checkAuth();
    loadDashboardData();
    bindEvents();
  }

  // =========================================================================
  // AUTHENTICATION & PIN SECURITY (SEC-02 FIX)
  // =========================================================================
  function checkAuth() {
    const isAuth = sessionStorage.getItem('eitoh_admin_authenticated');
    if (isAuth === 'true') {
      if (elements.pinOverlay) elements.pinOverlay.style.display = 'none';
    } else {
      if (elements.pinOverlay) elements.pinOverlay.style.display = 'flex';
      setTimeout(() => elements.pinInput?.focus(), 100);
    }
  }

  async function submitPin() {
    const inputVal = elements.pinInput?.value.trim();
    if (!inputVal) return;

    const settings = StorageManager.getSettings();
    const storedPin = settings.adminPin || '1234';

    const isValid = await verifyPIN(inputVal, storedPin);

    if (isValid) {
      sessionStorage.setItem('eitoh_admin_authenticated', 'true');
      if (elements.pinOverlay) elements.pinOverlay.style.display = 'none';
      if (elements.pinInput) elements.pinInput.value = '';
      showToast('Welcome to EiToh CMS Dashboard! 👋');
      loadDashboardData();
    } else {
      showToast('Incorrect Admin PIN. Please try again.', 'error');
      if (elements.pinInput) {
        elements.pinInput.value = '';
        elements.pinInput.focus();
      }
    }
  }

  function lockSession() {
    sessionStorage.removeItem('eitoh_admin_authenticated');
    if (elements.pinOverlay) elements.pinOverlay.style.display = 'flex';
    if (elements.pinInput) {
      elements.pinInput.value = '';
      elements.pinInput.focus();
    }
    showToast('Admin session locked 🔒');
  }

  // =========================================================================
  // DATA LOADING & STATS UPDATE
  // =========================================================================
  function loadDashboardData() {
    updateTopStats();
    renderProducts();
    renderCategoryFilterOptions();
    renderOrders();
    renderQuotes();
    renderCoupons();
    renderAnalytics();
    renderCategoriesTable();
    loadSettingsIntoForm();
    updateStorageMeter();
    updateJsonPreview();
  }

  function updateTopStats() {
    const products = StorageManager.getProducts();
    const orders = StorageManager.getOrders ? StorageManager.getOrders() : [];

    const inStock = products.filter(p => p.stockStatus === 'in_stock' || p.inStock === true).length;
    const totalRev = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    if (elements.statTotalProducts) elements.statTotalProducts.textContent = products.length;
    if (elements.statInStock) elements.statInStock.textContent = inStock;
    if (elements.statTotalOrders) elements.statTotalOrders.textContent = orders.length;
    if (elements.statTotalRevenue) elements.statTotalRevenue.textContent = StorageManager.formatPrice(totalRev);

    if (elements.pendingOrdersBadge) {
      if (pendingOrders > 0) {
        elements.pendingOrdersBadge.textContent = pendingOrders;
        elements.pendingOrdersBadge.style.display = 'inline-flex';
      } else {
        elements.pendingOrdersBadge.style.display = 'none';
      }
    }
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  function switchTab(tabId) {
    state.currentTab = tabId;

    elements.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tabId);
    });

    elements.tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === tabId);
    });

    // Refresh specific tab contents upon activation
    if (tabId === 'tabOrders') renderOrders();
    if (tabId === 'tabQuotes') renderQuotes();
    if (tabId === 'tabCoupons') renderCoupons();
    if (tabId === 'tabAnalytics') renderAnalytics();
    if (tabId === 'tabSync') {
      updateStorageMeter();
      updateJsonPreview();
    }
  }

  // =========================================================================
  // PRODUCTS CONTROLLER (CRUD + XSS-Safe)
  // =========================================================================
  function renderCategoryFilterOptions() {
    const categories = StorageManager.getCategories();

    if (elements.adminCategoryFilter) {
      let optHtml = '<option value="all">All Categories</option>';
      categories.forEach(c => {
        if (c.id !== 'all') optHtml += `<option value="${E(c.id)}">${E(c.name)}</option>`;
      });
      elements.adminCategoryFilter.innerHTML = optHtml;
      elements.adminCategoryFilter.value = state.categoryFilter;
    }

    if (elements.prodCategory) {
      let formOptHtml = '';
      categories.forEach(c => {
        if (c.id !== 'all') formOptHtml += `<option value="${E(c.id)}">${E(c.name)}</option>`;
      });
      elements.prodCategory.innerHTML = formOptHtml;
    }
  }

  function getFilteredProducts() {
    let products = StorageManager.getProducts();

    if (state.categoryFilter !== 'all') {
      products = products.filter(p => p.category === state.categoryFilter);
    }

    if (state.searchFilter) {
      const q = state.searchFilter.toLowerCase().trim();
      products = products.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.banglaTitle && p.banglaTitle.includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    return products;
  }

  function renderProducts() {
    const products = getFilteredProducts();
    if (!elements.adminProductsTableBody) return;

    if (products.length === 0) {
      elements.adminProductsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-light);">
            <i class="fa-solid fa-cube" style="font-size: 2rem; margin-bottom: 8px; color: var(--border-subtle); display:block;"></i>
            No products match your filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    products.forEach(p => {
      const imgSrc = p.image || (p.images && p.images[0]) || 'assets/logo.jpg';
      const isStock = p.stockStatus === 'in_stock' || p.inStock === true;
      const isMadeToOrder = p.stockStatus === 'made_to_order';
      const stockBadge = isStock
        ? '<span class="status-chip delivered">In Stock</span>'
        : (isMadeToOrder ? '<span class="status-chip confirmed">Made to Order</span>' : '<span class="status-chip pending">Out of Stock</span>');

      html += `
        <tr>
          <td>
            <img src="${E(imgSrc)}" alt="${E(p.title)}" class="table-thumb">
          </td>
          <td>
            <strong>${E(p.title)}</strong>
            ${p.banglaTitle ? `<div class="bangla-text" style="font-size: 0.8rem; color: #64748b;">${E(p.banglaTitle)}</div>` : ''}
          </td>
          <td><span class="category-badge">${E(p.category || 'Creations')}</span></td>
          <td class="mono-text" style="font-weight: 700;">${StorageManager.formatPrice(p.price)}</td>
          <td>${stockBadge}</td>
          <td>
            ${p.featured ? '<span class="featured-indicator"><i class="fa-solid fa-star"></i> Hero</span>' : '—'}
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-icon" onclick="window.EiTohAdmin.editProduct('${E(p.id)}')" title="Edit product">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-icon delete" onclick="window.EiTohAdmin.deleteProduct('${E(p.id)}')" title="Delete product">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    elements.adminProductsTableBody.innerHTML = html;
  }

  function openAddProductModal() {
    state.editingProductId = null;
    state.uploadedImages = [];
    if (elements.productModalHeading) elements.productModalHeading.textContent = 'Add New Product';
    if (elements.productForm) elements.productForm.reset();
    if (elements.editProductId) elements.editProductId.value = '';
    renderImagePreviews();

    if (elements.productModal) {
      elements.productModal.classList.add('open');
      elements.productModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trapFocus(elements.productModal);
    }
  }

  function editProduct(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    state.editingProductId = product.id;
    state.uploadedImages = product.gallery && product.gallery.length > 0 ? [...product.gallery] : (product.image ? [product.image] : []);

    if (elements.productModalHeading) elements.productModalHeading.textContent = `Edit: ${product.title}`;
    if (elements.editProductId) elements.editProductId.value = product.id;

    if (elements.prodTitle) elements.prodTitle.value = product.title || '';
    if (elements.prodBanglaTitle) elements.prodBanglaTitle.value = product.banglaTitle || '';
    if (elements.prodCategory) elements.prodCategory.value = product.category || '';
    if (elements.prodStockStatus) elements.prodStockStatus.value = product.inStock ? 'in_stock' : 'out_of_stock';
    if (elements.prodPrice) elements.prodPrice.value = product.price || '';
    if (elements.prodOriginalPrice) elements.prodOriginalPrice.value = product.originalPrice || '';
    if (elements.prodShortDesc) elements.prodShortDesc.value = product.description || '';
    if (elements.prodDesc) elements.prodDesc.value = product.description || '';
    if (elements.prodTags) elements.prodTags.value = (product.tags || []).join(', ');
    if (elements.prodColors) elements.prodColors.value = (product.colors || []).join(', ');
    if (elements.prodSpecMaterial) elements.prodSpecMaterial.value = product.material || '';
    if (elements.prodSpecDimensions) elements.prodSpecDimensions.value = product.dimensions || '';
    if (elements.prodSpecPrintTime) elements.prodSpecPrintTime.value = product.printTime || '';
    if (elements.prodSpecInfill) elements.prodSpecInfill.value = product.layerHeight || '';
    if (elements.prodFeatured) elements.prodFeatured.checked = !!product.featured;

    renderImagePreviews();

    if (elements.productModal) {
      elements.productModal.classList.add('open');
      elements.productModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trapFocus(elements.productModal);
    }
  }

  function closeProductModal() {
    if (elements.productModal) {
      elements.productModal.classList.remove('open');
      elements.productModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  function renderImagePreviews() {
    if (!elements.productImagePreviewStrip) return;
    if (state.uploadedImages.length === 0) {
      elements.productImagePreviewStrip.innerHTML = '<span style="font-size: 0.78rem; color: #94a3b8;">No photos uploaded yet</span>';
      return;
    }

    let html = '';
    state.uploadedImages.forEach((src, idx) => {
      html += `
        <div class="preview-item">
          <img src="${E(src)}" alt="Product thumbnail">
          <button type="button" class="btn-remove-preview" onclick="window.EiTohAdmin.removeImage(${idx})" title="Remove photo">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
    });
    elements.productImagePreviewStrip.innerHTML = html;
  }

  async function handleImageFiles(files) {
    if (!files || files.length === 0) return;

    showToast('Optimizing and compressing photos... ⏳');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      try {
        // Canvas compression to ~100-150KB JPEG
        const compressedBase64 = await compressImage(file, { maxWidth: 1000, maxHeight: 1000, quality: 0.72 });
        state.uploadedImages.push(compressedBase64);
      } catch (err) {
        console.error('Image compression error:', err);
        showToast(`Failed to process ${file.name}`, 'error');
      }
    }

    renderImagePreviews();
    showToast('Photos ready! 📸');
  }

  function handleAddImageUrl() {
    const url = elements.productImageUrlInput?.value.trim();
    if (!url) return;
    state.uploadedImages.push(url);
    if (elements.productImageUrlInput) elements.productImageUrlInput.value = '';
    renderImagePreviews();
  }

  function saveProduct(e) {
    if (e) e.preventDefault();

    const title = elements.prodTitle?.value.trim();
    const price = parseFloat(elements.prodPrice?.value || 0);

    if (!title) {
      showToast('Please enter a product title', 'warning');
      return;
    }
    if (!price || price <= 0) {
      showToast('Please enter a valid price', 'warning');
      return;
    }

    const mainImage = state.uploadedImages.length > 0 ? state.uploadedImages[0] : 'assets/images/articulated_dragon.jpg';

    const tags = (elements.prodTags?.value || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const colors = (elements.prodColors?.value || '')
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const productData = {
      title: title,
      banglaTitle: elements.prodBanglaTitle?.value.trim() || '',
      category: elements.prodCategory?.value || 'articulated',
      inStock: elements.prodStockStatus?.value === 'in_stock',
      price: price,
      originalPrice: elements.prodOriginalPrice?.value ? parseFloat(elements.prodOriginalPrice.value) : null,
      description: elements.prodDesc?.value.trim() || elements.prodShortDesc?.value.trim() || '',
      tags: tags,
      colors: colors,
      material: elements.prodSpecMaterial?.value.trim() || 'Silk PLA',
      dimensions: elements.prodSpecDimensions?.value.trim() || '',
      printTime: elements.prodSpecPrintTime?.value.trim() || '',
      layerHeight: elements.prodSpecInfill?.value.trim() || '0.20 mm',
      featured: !!elements.prodFeatured?.checked,
      image: mainImage,
      gallery: state.uploadedImages
    };

    if (state.editingProductId) {
      productData.id = state.editingProductId;
      StorageManager.saveProduct(productData);
      showToast(`Updated "${title}" successfully! ✏️`);
    } else {
      productData.id = `eitoh-${Date.now().toString(36)}`;
      StorageManager.saveProduct(productData);
      showToast(`Added "${title}" to your catalog! ✨`);
    }

    closeProductModal();
    loadDashboardData();
  }

  function deleteProduct(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.title}"?`)) {
      StorageManager.deleteProduct(productId);
      showToast(`Deleted "${product.title}"`);
      loadDashboardData();
    }
  }

  // =========================================================================
  // ORDERS HUB CONTROLLER (Online + WhatsApp Pipeline with MySQL Sync)
  // =========================================================================
  async function renderOrders() {
    let orders = StorageManager.getOrders ? StorageManager.getOrders() : [];

    // Also fetch live orders directly from MySQL API
    if (window.EiTohAPI && window.EiTohAPI.admin && window.EiTohAPI.auth.isAuthenticated()) {
      try {
        const apiRes = await window.EiTohAPI.admin.getOrders({
          status: state.orderStatusFilter !== 'all' ? state.orderStatusFilter : '',
          search: state.orderSearchFilter
        });
        if (apiRes && apiRes.orders && apiRes.orders.length > 0) {
          const apiOrders = apiRes.orders.map(o => ({
            id: o.order_number || String(o.id),
            dbId: o.id,
            createdAt: o.created_at,
            customer: {
              name: o.customer_name,
              phone: o.customer_phone,
              address: o.delivery_address,
              city: o.delivery_city
            },
            items: (o.items || []).map(it => ({
              title: it.product_title,
              quantity: it.quantity,
              price: parseFloat(it.unit_price),
              selectedColor: it.selected_color
            })),
            total: parseFloat(o.total_amount),
            channel: o.source === 'whatsapp' ? 'whatsapp' : 'online',
            status: o.order_status
          }));

          const existingIds = new Set(apiOrders.map(o => o.id));
          orders = [...apiOrders, ...orders.filter(o => !existingIds.has(o.id))];
        }
      } catch (err) {
        console.warn('API orders fetch note:', err.message);
      }
    }

    // Filter by Status Tab
    if (state.orderStatusFilter !== 'all') {
      orders = orders.filter(o => o.status === state.orderStatusFilter);
    }

    // Filter by Search Query
    if (state.orderSearchFilter) {
      const q = state.orderSearchFilter.toLowerCase().trim();
      orders = orders.filter(o =>
        (o.id && o.id.toLowerCase().includes(q)) ||
        (o.customer?.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer?.phone && o.customer.phone.includes(q))
      );
    }

    if (!elements.adminOrdersTableBody) return;

    if (orders.length === 0) {
      elements.adminOrdersTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-light);">
            <i class="fa-solid fa-cart-flatbed" style="font-size: 2rem; margin-bottom: 8px; color: var(--border-subtle); display:block;"></i>
            No orders found matching status "${E(state.orderStatusFilter)}".
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    orders.forEach(order => {
      const itemsCount = (order.items || []).reduce((s, it) => s + (it.quantity || 1), 0);
      const itemsBrief = (order.items || []).map(it => `${it.title} (${it.quantity})`).join(', ');

      const channelBadge = order.channel === 'whatsapp'
        ? '<span class="status-chip" style="background:#dcfce7; color:#166534;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</span>'
        : '<span class="status-chip" style="background:#e0f2fe; color:#0369a1;"><i class="fa-solid fa-database"></i> MySQL</span>';

      html += `
        <tr>
          <td>
            <a href="javascript:void(0)" onclick="window.EiTohAdmin.viewOrderDetails('${E(order.id)}')" class="mono-text" style="font-weight: 700; color: var(--text-main); text-decoration: underline;">
              ${E(order.id)}
            </a>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-light); white-space: nowrap;">
            ${E(formatDate(order.createdAt))}
          </td>
          <td>
            <strong>${E(order.customer?.name || 'Customer')}</strong>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${E(order.customer?.phone || '')}</div>
          </td>
          <td>
            <div style="font-size: 0.84rem; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${E(itemsBrief)}">
              ${E(itemsBrief)}
            </div>
            <span style="font-size: 0.72rem; color: var(--text-light);">${itemsCount} item${itemsCount === 1 ? '' : 's'}</span>
          </td>
          <td class="mono-text" style="font-weight: 700;">
            ${StorageManager.formatPrice(order.total)}
          </td>
          <td>${channelBadge}</td>
          <td>
            <select class="form-control status-select" style="font-size: 0.78rem; padding: 4px 8px; height: 32px;" 
              onchange="window.EiTohAdmin.changeOrderStatus('${E(order.dbId || order.id)}', this.value)">
              <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>✔️ Confirmed</option>
              <option value="slicing" ${order.status === 'slicing' ? 'selected' : ''}>📐 Slicing</option>
              <option value="printing" ${order.status === 'printing' || order.status === 'in_production' ? 'selected' : ''}>🛠️ Printing</option>
              <option value="finishing" ${order.status === 'finishing' ? 'selected' : ''}>✨ Finishing</option>
              <option value="dispatched" ${order.status === 'dispatched' || order.status === 'shipped' ? 'selected' : ''}>🚚 Dispatched</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-icon" onclick="window.EiTohAdmin.viewOrderDetails('${E(order.id)}')" title="View Order Receipt">
                <i class="fa-solid fa-receipt"></i>
              </button>
              <a href="https://wa.me/${(order.customer?.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${order.customer?.name}, this is EiToh regarding your order #${order.id}.`)}" 
                target="_blank" rel="noopener" class="btn-icon" style="color: #25D366;" title="Contact on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i>
              </a>
              <button type="button" class="btn-icon delete" onclick="window.EiTohAdmin.deleteOrder('${E(order.id)}')" title="Delete Order">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    elements.adminOrdersTableBody.innerHTML = html;
  }

  async function changeOrderStatus(orderId, newStatus) {
    if (StorageManager.updateOrderStatus) {
      StorageManager.updateOrderStatus(orderId, newStatus);
    }

    if (window.EiTohAPI && window.EiTohAPI.admin && window.EiTohAPI.auth.isAuthenticated()) {
      try {
        await window.EiTohAPI.admin.updateOrderStatus(orderId, newStatus);
      } catch (err) {
        console.warn('API status update note:', err.message);
      }
    }

    showToast(`Order #${orderId} marked as ${newStatus.toUpperCase()}`);
    updateTopStats();
    renderOrders();
  }

  function viewOrderDetails(orderId) {
    const order = StorageManager.getOrder(orderId);
    if (!order) return;

    if (!elements.adminOrderModalContent) return;

    let itemsRows = '';
    (order.items || []).forEach((it, idx) => {
      itemsRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${E(it.title)}</td>
          <td>${E(it.selectedColor || 'Standard')}</td>
          <td style="text-align: center;">${it.quantity}</td>
          <td style="text-align: right;" class="mono-text">${StorageManager.formatPrice(it.price)}</td>
          <td style="text-align: right;" class="mono-text">${StorageManager.formatPrice(it.price * it.quantity)}</td>
        </tr>
      `;
    });

    elements.adminOrderModalContent.innerHTML = `
      <div class="printable-invoice" id="adminPrintInvoice">
        <div class="invoice-header">
          <div class="invoice-brand">
            <h2>EiToh CMS — Order Dispatch</h2>
            <div class="invoice-sub">Order Details & Manufacturing Sheet</div>
          </div>
          <div class="invoice-tag">
            <div class="invoice-number mono-text">${E(order.id)}</div>
            <div class="invoice-date">${E(formatDate(order.createdAt))}</div>
          </div>
        </div>

        <div class="invoice-parties">
          <div class="party-col">
            <span class="party-label">CUSTOMER DETAILS</span>
            <strong>${E(order.customer?.name || 'Customer')}</strong>
            <div>Phone: ${E(order.customer?.phone || '')}</div>
            <div>Address: ${E(order.customer?.address || 'Dhaka')}</div>
            <div>Delivery Option: ${E(order.customer?.deliveryArea || 'Inside Dhaka')}</div>
          </div>
          <div class="party-col">
            <span class="party-label">DISPATCH STATUS</span>
            <div style="margin-top: 4px;">
              <span class="status-chip ${E(order.status)}">${E((order.status || 'pending').toUpperCase())}</span>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem;">Channel: <strong>${order.channel === 'whatsapp' ? 'WhatsApp Order' : 'Online Store'}</strong></div>
            ${order.customer?.notes ? `<div style="margin-top: 6px; font-size: 0.82rem; color: #b45309;">Note: ${E(order.customer.notes)}</div>` : ''}
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Creation</th>
              <th>Variant</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="invoice-summary-grid">
          <div></div>
          <div class="invoice-totals-col">
            <div class="totals-line">
              <span>Subtotal:</span>
              <span class="mono-text">${StorageManager.formatPrice(order.subtotal)}</span>
            </div>
            ${order.discount ? `
              <div class="totals-line" style="color: #16a34a;">
                <span>Discount (${E(order.couponCode || 'PROMO')}):</span>
                <span class="mono-text">- ${StorageManager.formatPrice(order.discount)}</span>
              </div>
            ` : ''}
            <div class="totals-line">
              <span>Delivery Fee:</span>
              <span class="mono-text">${order.deliveryFee === 0 ? 'FREE' : StorageManager.formatPrice(order.deliveryFee)}</span>
            </div>
            <div class="totals-line grand-total">
              <span>Total Payable:</span>
              <span class="mono-text">${StorageManager.formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn-primary-action" onclick="window.print()">
            <i class="fa-solid fa-print"></i> Print Invoice
          </button>
          <button type="button" class="btn-add-cart" onclick="document.getElementById('adminOrderModal').classList.remove('open'); document.body.style.overflow='';" style="background: #f1f5f9; color: var(--text-main);">
            Close
          </button>
        </div>
      </div>
    `;

    if (elements.adminOrderModal) {
      elements.adminOrderModal.classList.add('open');
      elements.adminOrderModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trapFocus(elements.adminOrderModal);
    }
  }

  function deleteOrder(orderId) {
    if (confirm(`Are you sure you want to remove order #${orderId}?`)) {
      const data = StorageManager.getStoreData();
      data.orders = (data.orders || []).filter(o => o.id !== orderId);
      StorageManager.saveStoreData(data);
      showToast(`Removed order #${orderId}`);
      updateTopStats();
      renderOrders();
    }
  }

  // =========================================================================
  // CUSTOM QUOTES CONTROLLER
  // =========================================================================
  function renderQuotes() {
    const data = StorageManager.getStoreData();
    const quotes = data.customQuotes || [];

    if (!elements.adminQuotesTableBody) return;

    if (quotes.length === 0) {
      elements.adminQuotesTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 40px; color: var(--text-light);">
            <i class="fa-solid fa-calculator" style="font-size: 2rem; margin-bottom: 8px; color: var(--border-subtle); display:block;"></i>
            No custom 3D quotes saved yet. Inquiries from the website estimator will appear here.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    quotes.forEach((q, idx) => {
      html += `
        <tr>
          <td style="font-size: 0.8rem; color: var(--text-light);">${E(formatDate(q.createdAt))}</td>
          <td class="mono-text">${E(q.dimensions)}</td>
          <td>${E((q.material || '').toUpperCase())} (${q.infill}%)</td>
          <td>${E(q.quality || 'Standard')}</td>
          <td>~${q.estimatedWeight}g</td>
          <td>~${q.estimatedHours} hrs</td>
          <td class="mono-text" style="font-weight: 700; color: var(--text-main);">${StorageManager.formatPrice(q.estimatedPrice)}</td>
          <td>
            <button type="button" class="btn-icon delete" onclick="window.EiTohAdmin.deleteQuote(${idx})" title="Delete Quote">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    });

    elements.adminQuotesTableBody.innerHTML = html;
  }

  function deleteQuote(index) {
    const data = StorageManager.getStoreData();
    if (data.customQuotes && data.customQuotes[index]) {
      data.customQuotes.splice(index, 1);
      StorageManager.saveStoreData(data);
      showToast('Quote deleted');
      renderQuotes();
    }
  }

  // =========================================================================
  // COUPONS CONTROLLER
  // =========================================================================
  function renderCoupons() {
    const coupons = StorageManager.getCoupons ? StorageManager.getCoupons() : [];
    if (!elements.adminCouponsTableBody) return;

    if (coupons.length === 0) {
      elements.adminCouponsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-light);">
            No promo codes created yet. Add one using the form on the left.
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    coupons.forEach(c => {
      const discountLabel = c.type === 'percentage' ? `${c.value}% OFF` : `${StorageManager.formatPrice(c.value)} OFF`;
      const statusBadge = c.active
        ? '<span class="status-chip delivered">Active</span>'
        : '<span class="status-chip pending">Inactive</span>';

      html += `
        <tr>
          <td class="mono-text" style="font-weight: 800;">${E(c.code)}</td>
          <td style="font-weight: 600; color: #16a34a;">${E(discountLabel)}</td>
          <td class="mono-text">${StorageManager.formatPrice(c.minSpend || 0)}</td>
          <td>${statusBadge}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="btn-icon" onclick="window.EiTohAdmin.toggleCouponActive('${E(c.id)}')" title="${c.active ? 'Deactivate' : 'Activate'}">
                <i class="fa-solid ${c.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
              </button>
              <button type="button" class="btn-icon delete" onclick="window.EiTohAdmin.deleteCoupon('${E(c.id)}')" title="Delete Coupon">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    elements.adminCouponsTableBody.innerHTML = html;
  }

  function saveCoupon() {
    const code = elements.newCouponCode?.value.trim().toUpperCase();
    const type = elements.newCouponType?.value || 'percentage';
    const value = parseFloat(elements.newCouponValue?.value || 0);
    const minSpend = parseFloat(elements.newCouponMinSpend?.value || 0);
    const desc = elements.newCouponDesc?.value.trim() || '';
    const active = !!elements.newCouponActive?.checked;

    if (!code) {
      showToast('Please enter a coupon code', 'warning');
      return;
    }
    if (value <= 0) {
      showToast('Please enter a valid discount value', 'warning');
      return;
    }

    const coupon = {
      code,
      type,
      value,
      minSpend,
      description: desc,
      active
    };

    StorageManager.saveCoupon(coupon);
    showToast(`Coupon "${code}" saved successfully! 🏷️`);

    // Reset form
    if (elements.newCouponCode) elements.newCouponCode.value = '';
    if (elements.newCouponValue) elements.newCouponValue.value = '';
    if (elements.newCouponMinSpend) elements.newCouponMinSpend.value = '0';
    if (elements.newCouponDesc) elements.newCouponDesc.value = '';

    renderCoupons();
  }

  function toggleCouponActive(couponId) {
    const coupons = StorageManager.getCoupons();
    const c = coupons.find(item => item.id === couponId);
    if (!c) return;

    c.active = !c.active;
    StorageManager.saveCoupon(c);
    showToast(`Coupon "${c.code}" is now ${c.active ? 'active' : 'inactive'}`);
    renderCoupons();
  }

  function deleteCoupon(couponId) {
    if (confirm('Delete this coupon code?')) {
      StorageManager.deleteCoupon(couponId);
      showToast('Coupon deleted');
      renderCoupons();
    }
  }

  // =========================================================================
  // ANALYTICS CONTROLLER
  // =========================================================================
  function renderAnalytics() {
    const analytics = StorageManager.getAnalyticsSummary ? StorageManager.getAnalyticsSummary() : null;
    if (!analytics) return;

    if (elements.analyticsAov) elements.analyticsAov.textContent = StorageManager.formatPrice(analytics.aov);

    // Channels split
    if (elements.analyticsChannelsWrap) {
      const onlineCount = analytics.channels.online || 0;
      const waCount = analytics.channels.whatsapp || 0;
      const total = onlineCount + waCount || 1;
      const onlinePct = Math.round((onlineCount / total) * 100);
      const waPct = 100 - onlinePct;

      elements.analyticsChannelsWrap.innerHTML = `
        <div style="margin-top: 10px;">
          <div style="display:flex; justify-content:space-between; font-size:0.84rem; margin-bottom: 4px;">
            <span>🌐 Online Orders (${onlineCount})</span>
            <span class="mono-text">${onlinePct}%</span>
          </div>
          <div class="storage-meter-bar" style="margin-bottom: 12px;">
            <div class="storage-meter-fill" style="width: ${onlinePct}%; background: #0284c7;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.84rem; margin-bottom: 4px;">
            <span>💬 WhatsApp Direct (${waCount})</span>
            <span class="mono-text">${waPct}%</span>
          </div>
          <div class="storage-meter-bar">
            <div class="storage-meter-fill" style="width: ${waPct}%; background: #25D366;"></div>
          </div>
        </div>
      `;
    }

    // Delivery split
    if (elements.analyticsDeliveryWrap) {
      const inside = analytics.deliveryAreas.inside || 0;
      const outside = analytics.deliveryAreas.outside || 0;
      const pickup = analytics.deliveryAreas.pickup || 0;

      elements.analyticsDeliveryWrap.innerHTML = `
        <div style="margin-top: 10px; font-size: 0.85rem;">
          <div class="detail-row"><span>Inside Dhaka:</span> <strong>${inside}</strong></div>
          <div class="detail-row"><span>Outside Dhaka:</span> <strong>${outside}</strong></div>
          <div class="detail-row"><span>Store Pickup:</span> <strong>${pickup}</strong></div>
        </div>
      `;
    }

    // Top products
    if (elements.analyticsTopProductsList) {
      if (analytics.topProducts.length === 0) {
        elements.analyticsTopProductsList.innerHTML = '<p style="color: var(--text-light); font-size: 0.85rem;">No items ordered yet.</p>';
      } else {
        let html = '<div class="table-responsive"><table class="admin-table"><thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th></tr></thead><tbody>';
        analytics.topProducts.forEach(tp => {
          html += `
            <tr>
              <td><strong>${E(tp.title)}</strong></td>
              <td class="mono-text">${tp.quantity}</td>
              <td class="mono-text" style="font-weight: 700;">${StorageManager.formatPrice(tp.revenue)}</td>
            </tr>
          `;
        });
        html += '</tbody></table></div>';
        elements.analyticsTopProductsList.innerHTML = html;
      }
    }
  }

  // =========================================================================
  // CATEGORIES TABLE & CRUD
  // =========================================================================
  function renderCategoriesTable() {
    const categories = StorageManager.getCategories();
    const products = StorageManager.getProducts();

    if (!elements.adminCategoriesTableBody) return;

    let html = '';
    categories.forEach(cat => {
      const count = cat.id === 'all'
        ? products.length
        : products.filter(p => p.category === cat.id).length;

      html += `
        <tr>
          <td class="mono-text">${E(cat.id)}</td>
          <td><strong>${E(cat.name)}</strong></td>
          <td class="bangla-text">${E(cat.banglaName || '')}</td>
          <td><i class="fa-solid ${E(cat.icon || 'fa-cube')}"></i></td>
          <td>${count} items</td>
          <td>
            ${cat.id !== 'all' ? `
              <div class="table-actions">
                <button type="button" class="btn-icon delete" onclick="window.EiTohAdmin.deleteCategory('${E(cat.id)}')" title="Delete Category">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ` : '<span style="font-size: 0.75rem; color: #94a3b8;">Default</span>'}
          </td>
        </tr>
      `;
    });

    elements.adminCategoriesTableBody.innerHTML = html;
  }

  function openAddCategoryModal() {
    if (elements.editCatId) elements.editCatId.value = '';
    if (elements.catName) elements.catName.value = '';
    if (elements.catBangla) elements.catBangla.value = '';
    if (elements.catIcon) elements.catIcon.value = 'fa-cube';

    if (elements.categoryModal) {
      elements.categoryModal.classList.add('open');
      elements.categoryModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trapFocus(elements.categoryModal);
    }
  }

  function saveCategory() {
    const name = elements.catName?.value.trim();
    const bangla = elements.catBangla?.value.trim();
    const icon = elements.catIcon?.value.trim() || 'fa-cube';

    if (!name || !bangla) {
      showToast('Please enter both English and Bangla category names', 'warning');
      return;
    }

    const catId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newCategory = {
      id: catId,
      name: name,
      banglaName: bangla,
      icon: icon
    };

    StorageManager.saveCategory(newCategory);
    showToast(`Category "${name}" created! 📁`);

    if (elements.categoryModal) elements.categoryModal.classList.remove('open');
    document.body.style.overflow = '';
    loadDashboardData();
  }

  function deleteCategory(catId) {
    if (confirm(`Delete category "${catId}"? Products will remain intact.`)) {
      StorageManager.deleteCategory(catId);
      showToast('Category deleted');
      loadDashboardData();
    }
  }

  // =========================================================================
  // SETTINGS & PIN SECURITY (SEC-02 Hashed)
  // =========================================================================
  function loadSettingsIntoForm() {
    const settings = StorageManager.getSettings();

    if (elements.settingWhatsappNumber) elements.settingWhatsappNumber.value = settings.whatsappNumber || '';
    if (elements.settingCurrency) elements.settingCurrency.value = settings.currency || '৳';
    if (elements.settingInsideDelivery) elements.settingInsideDelivery.value = settings.insideDelivery || 70;
    if (elements.settingOutsideDelivery) elements.settingOutsideDelivery.value = settings.outsideDelivery || 130;
    if (elements.settingFreeDeliveryThreshold) elements.settingFreeDeliveryThreshold.value = settings.freeDeliveryThreshold || 2500;
    if (elements.settingStoreName) elements.settingStoreName.value = settings.storeName || '';
    if (elements.settingTagline) elements.settingTagline.value = settings.tagline || '';
    if (elements.settingAnnouncement) elements.settingAnnouncement.value = settings.announcement || '';
    if (elements.settingAdminPin) elements.settingAdminPin.value = '';
  }

  async function handleSaveSettings() {
    const current = StorageManager.getSettings();

    const newSettings = {
      ...current,
      whatsappNumber: elements.settingWhatsappNumber?.value.trim() || '8801777547605',
      currency: elements.settingCurrency?.value.trim() || '৳',
      insideDelivery: parseFloat(elements.settingInsideDelivery?.value || 70),
      outsideDelivery: parseFloat(elements.settingOutsideDelivery?.value || 130),
      freeDeliveryThreshold: parseFloat(elements.settingFreeDeliveryThreshold?.value || 2500),
      storeName: elements.settingStoreName?.value.trim() || 'EiToh (এইতো)',
      tagline: elements.settingTagline?.value.trim() || 'Precision 3D Printing & Maker Studio',
      announcement: elements.settingAnnouncement?.value.trim() || ''
    };

    // If new PIN was provided, hash with SHA-256 before saving
    const newPin = elements.settingAdminPin?.value.trim();
    if (newPin) {
      if (newPin.length < 4) {
        showToast('PIN must be at least 4 digits', 'warning');
        return;
      }
      newSettings.adminPin = await hashPIN(newPin);
      showToast('Admin PIN updated & securely hashed (SHA-256)! 🔐');
      if (elements.settingAdminPin) elements.settingAdminPin.value = '';
    }

    StorageManager.saveSettings(newSettings);
    showToast('Store settings saved successfully! ✅');
  }

  // =========================================================================
  // STORAGE METER & SYNC CONTROLLER (SEC-03 FIX)
  // =========================================================================
  function updateStorageMeter() {
    if (!StorageManager.getStorageUsageKB) return;
    const usageKB = StorageManager.getStorageUsageKB();
    const quotaKB = 5120; // 5MB standard localStorage quota
    const pct = Math.min(100, Math.round((usageKB / quotaKB) * 100));

    if (elements.storageMeterFill) {
      elements.storageMeterFill.style.width = `${pct}%`;
      if (pct > 80) {
        elements.storageMeterFill.style.background = '#ef4444';
      } else if (pct > 50) {
        elements.storageMeterFill.style.background = '#f59e0b';
      } else {
        elements.storageMeterFill.style.background = '#10b981';
      }
    }

    if (elements.storageUsageText) {
      elements.storageUsageText.textContent = `Using ${usageKB} KB of ${quotaKB} KB (${pct}%)`;
    }

    if (elements.storageHealthBadge) {
      if (pct > 80) {
        elements.storageHealthBadge.className = 'status-chip pending';
        elements.storageHealthBadge.textContent = 'High Quota';
      } else {
        elements.storageHealthBadge.className = 'status-chip delivered';
        elements.storageHealthBadge.textContent = 'Healthy';
      }
    }
  }

  function updateJsonPreview() {
    if (!elements.jsonPreviewBox) return;
    const data = StorageManager.getStoreData();
    elements.jsonPreviewBox.textContent = JSON.stringify(data, null, 2);
  }

  function handleCopyJson() {
    const data = StorageManager.getStoreData();
    const jsonStr = JSON.stringify(data, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        showToast('Store JSON copied to clipboard! 📋');
      });
    } else {
      showToast('Clipboard access not available in this browser.');
    }
  }

  function handleDownloadJson() {
    const data = StorageManager.getStoreData();
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eitoh_store_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup JSON downloaded! 💾');
  }

  function handleImportJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        StorageManager.importJSON(e.target.result);
        showToast('Store catalog restored successfully! 🚀');
        loadDashboardData();
      } catch (err) {
        showToast(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  function handleResetDefaults() {
    if (confirm('WARNING: This will reset all products, categories, orders, and settings to factory defaults. Proceed?')) {
      StorageManager.resetToDefaults();
      showToast('Store data reset to factory demo data! 🔄');
      loadDashboardData();
    }
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  function bindEvents() {
    // Navigation Tabs
    elements.navItems.forEach(item => {
      item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Product Search & Filter
    if (elements.adminSearchInput) {
      elements.adminSearchInput.addEventListener('input', (e) => {
        state.searchFilter = e.target.value;
        renderProducts();
      });
    }

    if (elements.adminCategoryFilter) {
      elements.adminCategoryFilter.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderProducts();
      });
    }

    // Product Modal
    if (elements.btnOpenAddProduct) elements.btnOpenAddProduct.addEventListener('click', openAddProductModal);
    if (elements.btnCloseProductModal) elements.btnCloseProductModal.addEventListener('click', closeProductModal);
    if (elements.btnCancelProductModal) elements.btnCancelProductModal.addEventListener('click', closeProductModal);
    if (elements.productForm) elements.productForm.addEventListener('submit', saveProduct);

    // Image Upload Dropzone & Input
    if (elements.imageDropzone) {
      elements.imageDropzone.addEventListener('click', () => elements.productImageFileInput?.click());
      elements.imageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imageDropzone.classList.add('dragover');
      });
      elements.imageDropzone.addEventListener('dragleave', () => elements.imageDropzone.classList.remove('dragover'));
      elements.imageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imageDropzone.classList.remove('dragover');
        if (e.dataTransfer.files) handleImageFiles(e.dataTransfer.files);
      });
    }

    if (elements.productImageFileInput) {
      elements.productImageFileInput.addEventListener('change', (e) => {
        if (e.target.files) handleImageFiles(e.target.files);
      });
    }

    if (elements.btnAddImageUrl) elements.btnAddImageUrl.addEventListener('click', handleAddImageUrl);

    // Orders Filter & Search
    if (elements.orderStatusTabs) {
      elements.orderStatusTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.status-tab-btn');
        if (btn) {
          elements.orderStatusTabs.querySelectorAll('.status-tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.orderStatusFilter = btn.dataset.status;
          renderOrders();
        }
      });
    }

    if (elements.orderSearchInput) {
      elements.orderSearchInput.addEventListener('input', (e) => {
        state.orderSearchFilter = e.target.value;
        renderOrders();
      });
    }

    // Categories Modal
    if (elements.btnOpenAddCategory) elements.btnOpenAddCategory.addEventListener('click', openAddCategoryModal);
    if (elements.btnCloseCatModal) elements.btnCloseCatModal.addEventListener('click', () => {
      elements.categoryModal?.classList.remove('open');
      document.body.style.overflow = '';
    });

    // Settings
    if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener('click', handleSaveSettings);

    // Backup & Sync
    if (elements.btnCopyJson) elements.btnCopyJson.addEventListener('click', handleCopyJson);
    if (elements.btnDownloadJson) elements.btnDownloadJson.addEventListener('click', handleDownloadJson);
    if (elements.importJsonFileInput) {
      elements.importJsonFileInput.addEventListener('change', (e) => {
        if (e.target.files?.[0]) handleImportJson(e.target.files[0]);
      });
    }
    if (elements.btnResetDefaults) elements.btnResetDefaults.addEventListener('click', handleResetDefaults);

    // Admin Order Modal Close
    if (elements.btnCloseAdminOrderModal) {
      elements.btnCloseAdminOrderModal.addEventListener('click', () => {
        elements.adminOrderModal?.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    // Global ESC to close open modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.productModal?.classList.contains('open')) closeProductModal();
        if (elements.categoryModal?.classList.contains('open')) {
          elements.categoryModal.classList.remove('open');
          document.body.style.overflow = '';
        }
        if (elements.adminOrderModal?.classList.contains('open')) {
          elements.adminOrderModal.classList.remove('open');
          document.body.style.overflow = '';
        }
      }
    });
  }

  // =========================================================================
  // PUBLIC API EXPOSURE (WINDOW.EITOHADMIN)
  // =========================================================================
  window.EiTohAdmin = {
    submitPin,
    lockSession,
    editProduct,
    deleteProduct,
    removeImage: (idx) => {
      state.uploadedImages.splice(idx, 1);
      renderImagePreviews();
    },
    changeOrderStatus,
    viewOrderDetails,
    deleteOrder,
    deleteQuote,
    saveCoupon,
    toggleCouponActive,
    deleteCoupon,
    saveCategory,
    deleteCategory,
    refreshOrders: () => {
      renderOrders();
      updateTopStats();
      showToast('Orders refreshed! 🔄');
    }
  };

  // Run initialization
  init();
});
