/**
 * EiToh (এইতো) — Customer Storefront & Catalog Controller v2.0
 * 
 * Features:
 * - High-speed catalog with multi-category filters, tags, and search
 * - XSS-sanitized template rendering with EiTohUtils.escapeHTML
 * - Quick-view modal with specification tables, color picker, and wishlist
 * - Multi-step checkout drawer with dual-path ordering:
 *     1. Traditional Online Order (stored locally, generates receipt, trackable)
 *     2. Instant WhatsApp Dispatch (formatted message + automatic order recording)
 * - Dynamic coupon application with instant feedback
 * - Interactive 3D Print Cost Estimator (dimensions, material, infill, resolution)
 * - Order Tracker with live progress timeline
 * - Saved Items (Wishlist) drawer
 * - Printable Order Receipt Modal
 * - Light / Dark Theme toggle with persistent storage
 * - Accessible modals with focus trapping & live screen-reader announcements
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const { escapeHTML: E, showToast, trapFocus, buildWhatsAppURL, announce, debounce } = window.EiTohUtils || {
    escapeHTML: s => String(s || ''),
    showToast: (msg) => alert(msg),
    trapFocus: () => () => {},
    buildWhatsAppURL: () => '',
    announce: () => {},
    debounce: fn => fn
  };

  // =========================================================================
  // APPLICATION STATE
  // =========================================================================
  const state = {
    selectedCategory: 'all',
    selectedTag: 'all',
    searchQuery: '',
    sortBy: 'featured',
    selectedDeliveryArea: 'inside', // 'inside', 'outside', 'pickup'
    modalProduct: null,
    modalSelectedColor: null,
    modalQty: 1,
    checkoutStep: 1, // 1: Cart items, 2: Customer details, 3: Confirmation
    appliedCoupon: null,
    lastPlacedOrder: null,
    modalUntrapFn: null,
    cartUntrapFn: null,
    trackerUntrapFn: null,
    wishlistUntrapFn: null,
    receiptUntrapFn: null
  };

  // =========================================================================
  // DOM ELEMENT REFERENCES
  // =========================================================================
  const elements = {
    // Header & Announcement
    topAnnouncement: document.getElementById('topAnnouncement'),
    announcementText: document.getElementById('announcementText'),
    brandTagline: document.getElementById('brandTagline'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    btnOpenTracker: document.getElementById('btnOpenTracker'),
    btnOpenWishlist: document.getElementById('btnOpenWishlist'),
    wishlistCount: document.getElementById('wishlistCount'),
    headerCartCount: document.getElementById('headerCartCount'),
    cartTriggerBtn: document.getElementById('cartTriggerBtn'),
    headerWhatsappBtn: document.getElementById('headerWhatsappBtn'),
    footerWhatsappLink: document.getElementById('footerWhatsappLink'),

    // Modern Navbar & Mobile Drawer References
    headerNavLinks: document.getElementById('headerNavLinks'),
    navCustomLink: document.getElementById('navCustomLink'),
    btnStudioTools: document.getElementById('btnStudioTools'),
    studioDropdownMenu: document.getElementById('studioDropdownMenu'),
    btnMobileNavToggle: document.getElementById('btnMobileNavToggle'),
    mobileNavOverlay: document.getElementById('mobileNavOverlay'),
    btnCloseMobileNav: document.getElementById('btnCloseMobileNav'),
    mobileSearchInput: document.getElementById('mobileSearchInput'),
    mobileLinkCatalog: document.getElementById('mobileLinkCatalog'),
    mobileLinkEstimator: document.getElementById('mobileLinkEstimator'),
    mobileLinkTracker: document.getElementById('mobileLinkTracker'),
    mobileLinkWishlist: document.getElementById('mobileLinkWishlist'),
    mobileWhatsappLink: document.getElementById('mobileWhatsappLink'),
    mobileThemeToggleBtn: document.getElementById('mobileThemeToggleBtn'),

    // Hero
    heroShowcaseImg: document.getElementById('heroShowcaseImg'),
    heroShowcaseTitle: document.getElementById('heroShowcaseTitle'),
    heroShowcaseDesc: document.getElementById('heroShowcaseDesc'),
    heroShowcasePrice: document.getElementById('heroShowcasePrice'),
    btnHeroCustomQuote: document.getElementById('btnHeroCustomQuote'),

    // Estimator
    estLength: document.getElementById('estLength'),
    estWidth: document.getElementById('estWidth'),
    estHeight: document.getElementById('estHeight'),
    estMaterial: document.getElementById('estMaterial'),
    estInfill: document.getElementById('estInfill'),
    estInfillVal: document.getElementById('estInfillVal'),
    estQuality: document.getElementById('estQuality'),
    estPriceDisplay: document.getElementById('estPriceDisplay'),
    estWeightDisplay: document.getElementById('estWeightDisplay'),
    estTimeDisplay: document.getElementById('estTimeDisplay'),
    estVolumeDisplay: document.getElementById('estVolumeDisplay'),
    estMaterialDisplay: document.getElementById('estMaterialDisplay'),
    btnEstimatorWhatsApp: document.getElementById('btnEstimatorWhatsApp'),
    btnEstimatorSaveQuote: document.getElementById('btnEstimatorSaveQuote'),

    // Catalog Controls
    btnFilterTrigger: document.getElementById('btnFilterTrigger'),
    filterPopoverPanel: document.getElementById('filterPopoverPanel'),
    popoverCategoryGrid: document.getElementById('popoverCategoryGrid'),
    popoverTagsGrid: document.getElementById('popoverTagsGrid'),
    filterCountBadge: document.getElementById('filterCountBadge'),
    activeFilterChipsWrap: document.getElementById('activeFilterChipsWrap'),
    btnClearFilters: document.getElementById('btnClearFilters'),
    sortSelect: document.getElementById('sortSelect'),
    productCountLabel: document.getElementById('productCountLabel'),
    productGrid: document.getElementById('productGrid'),

    // Quick View Modal
    quickViewModal: document.getElementById('quickViewModal'),
    btnCloseModal: document.getElementById('btnCloseModal'),
    modalImg: document.getElementById('modalImg'),
    modalCategory: document.getElementById('modalCategory'),
    modalStockBadge: document.getElementById('modalStockBadge'),
    modalTitle: document.getElementById('modalTitle'),
    modalBanglaTitle: document.getElementById('modalBanglaTitle'),
    modalCurrentPrice: document.getElementById('modalCurrentPrice'),
    modalOrigPrice: document.getElementById('modalOrigPrice'),
    modalDiscountTag: document.getElementById('modalDiscountTag'),
    modalRating: document.getElementById('modalRating'),
    modalReviews: document.getElementById('modalReviews'),
    modalDesc: document.getElementById('modalDesc'),
    modalSpecsWrap: document.getElementById('modalSpecsWrap'),
    modalSpecsTable: document.getElementById('modalSpecsTable'),
    modalVariantContainer: document.getElementById('modalVariantContainer'),
    modalColorPills: document.getElementById('modalColorPills'),
    modalQtyDisplay: document.getElementById('modalQtyDisplay'),
    btnModalDec: document.getElementById('btnModalDec'),
    btnModalInc: document.getElementById('btnModalInc'),
    btnModalAddToCart: document.getElementById('btnModalAddToCart'),
    btnModalWishlist: document.getElementById('btnModalWishlist'),
    modalWishlistIcon: document.getElementById('modalWishlistIcon'),

    // Cart Drawer & Checkout Steps
    cartOverlay: document.getElementById('cartOverlay'),
    btnCloseCart: document.getElementById('btnCloseCart'),
    drawerCartCount: document.getElementById('drawerCartCount'),
    checkoutStepsBar: document.getElementById('checkoutStepsBar'),
    checkoutStep1: document.getElementById('checkoutStep1'),
    checkoutStep2: document.getElementById('checkoutStep2'),
    checkoutStep3: document.getElementById('checkoutStep3'),
    cartDrawerBody: document.getElementById('cartDrawerBody'),
    cartDrawerFooter: document.getElementById('cartDrawerFooter'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartDiscountLine: document.getElementById('cartDiscountLine'),
    cartDiscount: document.getElementById('cartDiscount'),
    cartDeliveryCharge: document.getElementById('cartDeliveryCharge'),
    cartGrandTotal: document.getElementById('cartGrandTotal'),
    btnToStep2: document.getElementById('btnToStep2'),
    btnBackToStep1: document.getElementById('btnBackToStep1'),
    btnPlaceOrderOnline: document.getElementById('btnPlaceOrderOnline'),
    btnWhatsappCheckout: document.getElementById('btnWhatsappCheckout'),
    orderConfirmationWrap: document.getElementById('orderConfirmationWrap'),

    // Checkout Form Inputs
    checkoutName: document.getElementById('checkoutName'),
    checkoutPhone: document.getElementById('checkoutPhone'),
    checkoutDeliveryArea: document.getElementById('checkoutDeliveryArea'),
    checkoutAddressWrap: document.getElementById('checkoutAddressWrap'),
    checkoutAddress: document.getElementById('checkoutAddress'),
    checkoutNotes: document.getElementById('checkoutNotes'),
    couponCodeInput: document.getElementById('couponCodeInput'),
    btnApplyCoupon: document.getElementById('btnApplyCoupon'),
    couponFeedback: document.getElementById('couponFeedback'),

    // Order Tracker Modal
    trackerModal: document.getElementById('trackerModal'),
    btnCloseTracker: document.getElementById('btnCloseTracker'),
    trackerSearchInput: document.getElementById('trackerSearchInput'),
    btnTrackerSearch: document.getElementById('btnTrackerSearch'),
    trackerResults: document.getElementById('trackerResults'),

    // Wishlist Modal
    wishlistModal: document.getElementById('wishlistModal'),
    btnCloseWishlist: document.getElementById('btnCloseWishlist'),
    wishlistItems: document.getElementById('wishlistItems'),

    // Receipt Modal
    receiptModal: document.getElementById('receiptModal'),
    btnCloseReceipt: document.getElementById('btnCloseReceipt'),
    receiptContent: document.getElementById('receiptContent'),
    btnPrintReceipt: document.getElementById('btnPrintReceipt')
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    initTheme();
    loadSettings();
    renderCategories();
    renderActiveFilterChips();
    renderProducts();
    updateCartUI();
    updateWishlistBadge();
    initEstimator();
    bindEvents();

    // Dynamically synchronize products with backend MySQL / static json
    if (StorageManager.syncWithBackend) {
      StorageManager.syncWithBackend().then(() => {
        renderCategories();
        renderProducts();
      });
    }

    // Listen for storage events (e.g. admin updates in another tab)
    window.addEventListener('storage', (e) => {
      if (e.key === 'eitoh_catalogue_data') {
        loadSettings();
        renderCategories();
        renderProducts();
        updateCartUI();
      }
    });

    // Check for URL parameters (e.g. ?track=EITOH-XXXX or ?product=eitoh-001)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('track')) {
      const trackId = urlParams.get('track');
      openOrderTracker(trackId);
    } else if (urlParams.has('product')) {
      const pid = urlParams.get('product');
      openQuickView(pid);
    }
  }

  // =========================================================================
  // THEME MANAGEMENT
  // =========================================================================
  function initTheme() {
    const currentTheme = StorageManager.getTheme ? StorageManager.getTheme() : 'light';
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (elements.themeIcon) {
      if (theme === 'dark') {
        elements.themeIcon.className = 'fa-solid fa-sun';
        if (elements.themeToggleBtn) elements.themeToggleBtn.title = 'Switch to Light Mode';
      } else {
        elements.themeIcon.className = 'fa-solid fa-moon';
        if (elements.themeToggleBtn) elements.themeToggleBtn.title = 'Switch to Dark Mode';
      }
    }
    if (StorageManager.setTheme) {
      StorageManager.setTheme(theme);
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    showToast(`Switched to ${next} mode`);
  }

  // =========================================================================
  // STORE SETTINGS & CONTACT
  // =========================================================================
  function loadSettings() {
    const settings = StorageManager.getSettings();
    if (elements.announcementText && settings.announcement) {
      elements.announcementText.innerHTML = `✦ ${E(settings.announcement)}`;
    }
    if (elements.brandTagline && settings.tagline) {
      elements.brandTagline.textContent = settings.tagline;
    }

    const cleanNumber = (settings.whatsappNumber || '8801777547605').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent("Hello EiToh! I'm interested in custom 3D printing & orders.")}`;
    if (elements.headerWhatsappBtn) elements.headerWhatsappBtn.href = waUrl;
    if (elements.footerWhatsappLink) elements.footerWhatsappLink.href = waUrl;
    if (elements.mobileWhatsappLink) elements.mobileWhatsappLink.href = waUrl;
  }

  // =========================================================================
  // CATEGORIES & FILTER RENDERING
  // =========================================================================
  function renderCategories() {
    const categories = StorageManager.getCategories();
    const products = StorageManager.getProducts();

    if (!elements.popoverCategoryGrid) return;

    let html = '';
    categories.forEach(cat => {
      const count = cat.id === 'all'
        ? products.length
        : products.filter(p => p.category === cat.id).length;

      const isActive = state.selectedCategory === cat.id ? 'active' : '';

      html += `
        <button type="button" class="popover-cat-btn ${isActive}" data-category="${E(cat.id)}">
          <span><i class="fa-solid ${E(cat.icon || 'fa-cube')}" style="margin-right: 6px; font-size: 0.75rem;"></i> ${E(cat.name)}</span>
          <span class="popover-cat-badge">(${count})</span>
        </button>
      `;
    });

    elements.popoverCategoryGrid.innerHTML = html;
  }

  function renderActiveFilterChips() {
    const categories = StorageManager.getCategories();
    let activeFiltersCount = 0;
    let chipsHtml = '';

    if (state.selectedCategory !== 'all') {
      activeFiltersCount++;
      const cat = categories.find(c => c.id === state.selectedCategory);
      const catName = cat ? cat.name : state.selectedCategory;
      chipsHtml += `
        <span class="active-filter-chip">
          <span>${E(catName)}</span>
          <i class="fa-solid fa-xmark" onclick="window.EiTohApp.clearCategoryFilter(event)" title="Remove category"></i>
        </span>
      `;
    }

    if (state.selectedTag !== 'all') {
      activeFiltersCount++;
      const tagLabel = state.selectedTag === 'in_stock' ? 'In Stock' : state.selectedTag;
      chipsHtml += `
        <span class="active-filter-chip">
          <span>${E(tagLabel)}</span>
          <i class="fa-solid fa-xmark" onclick="window.EiTohApp.clearTagFilter(event)" title="Remove tag"></i>
        </span>
      `;
    }

    if (elements.activeFilterChipsWrap) {
      elements.activeFilterChipsWrap.innerHTML = chipsHtml;
    }

    if (elements.filterCountBadge) {
      if (activeFiltersCount > 0) {
        elements.filterCountBadge.textContent = activeFiltersCount;
        elements.filterCountBadge.style.display = 'inline-flex';
        elements.btnFilterTrigger?.classList.add('active');
      } else {
        elements.filterCountBadge.style.display = 'none';
        elements.btnFilterTrigger?.classList.remove('active');
      }
    }

    // Update active class on tag chips in popover
    if (elements.popoverTagsGrid) {
      elements.popoverTagsGrid.querySelectorAll('.popover-tag-chip').forEach(chip => {
        if (chip.dataset.tag === state.selectedTag) {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }
      });
    }
  }

  function getFilteredProducts() {
    let products = StorageManager.getProducts();

    // 1. Category Filter
    if (state.selectedCategory !== 'all') {
      products = products.filter(p => p.category === state.selectedCategory);
    }

    // 2. Tag / Stock Filter
    if (state.selectedTag !== 'all') {
      if (state.selectedTag === 'in_stock') {
        products = products.filter(p => p.stockStatus === 'in_stock' || p.inStock === true);
      } else {
        products = products.filter(p => p.tags && p.tags.includes(state.selectedTag));
      }
    }

    // 3. Search Query Filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.banglaTitle && p.banglaTitle.includes(q)) ||
        (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        (p.material && p.material.toLowerCase().includes(q)) ||
        (p.specs && Object.values(p.specs).some(v => String(v).toLowerCase().includes(q)))
      );
    }

    // 4. Sorting
    switch (state.sortBy) {
      case 'price_low':
        products.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_high':
        products.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
      case 'featured':
      default:
        products.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });
        break;
    }

    return products;
  }

  // =========================================================================
  // PRODUCT GRID RENDERING (XSS-Safe via E, Editorial Design System)
  // =========================================================================
  function renderProducts() {
    const products = getFilteredProducts();
    const categories = StorageManager.getCategories();

    if (elements.productCountLabel) {
      elements.productCountLabel.textContent = `Showing ${products.length} item${products.length === 1 ? '' : 's'}`;
    }

    if (!elements.productGrid) return;

    if (products.length === 0) {
      elements.productGrid.innerHTML = `
        <div class="empty-catalog-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div style="font-size: 3rem; color: var(--border-color); margin-bottom: 16px;">
            <i class="fa-solid fa-cube"></i>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">No creations found</h3>
          <p style="color: var(--text-light); max-width: 400px; margin: 0 auto 20px;">
            We couldn't find any creations matching your search or filters. Try adjusting your query or reset filters.
          </p>
          <button type="button" class="btn-editorial-dark" onclick="window.EiTohApp.resetAllFilters()">
            Reset All Filters
          </button>
        </div>
      `;
      return;
    }

    let html = '';
    products.forEach(p => {
      // Resolve image from either p.image (admin upload) or p.images array (seed data)
      const imgSrc = p.image || (p.images && p.images[0]) || 'assets/logo.jpg';

      // Stock status resolution
      const isStock = p.stockStatus === 'in_stock' || p.inStock === true;
      const isMadeToOrder = p.stockStatus === 'made_to_order';

      const discount = p.originalPrice && p.originalPrice > p.price
        ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
        : null;

      const isWishlisted = StorageManager.isInWishlist ? StorageManager.isInWishlist(p.id) : false;

      // Category lookup
      const cat = categories.find(c => c.id === p.category);
      const catName = cat ? cat.name : (p.category || 'Creations');

      html += `
        <article class="product-card" data-product-id="${E(p.id)}">
          <div class="card-image-wrap" onclick="window.EiTohApp.openQuickView('${E(p.id)}')">
            <img src="${E(imgSrc)}" alt="${E(p.title)}" loading="lazy">
            <div class="card-badge-container">
              ${p.featured ? '<span class="badge-pill badge-popular">Featured</span>' : ''}
              ${discount ? `<span class="badge-pill" style="background: #ea580c; color: #fff;">-${discount}%</span>` : ''}
              <span class="badge-pill ${isStock ? 'badge-stock-in' : (isMadeToOrder ? 'badge-stock-order' : 'badge-stock-out')}">
                ${isStock ? 'In Stock' : (isMadeToOrder ? 'Made to Order' : 'Out of Stock')}
              </span>
            </div>
            <div class="card-quick-actions">
              <button type="button" class="btn-card-action" 
                onclick="window.EiTohApp.toggleWishlist('${E(p.id)}', event)" 
                aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}"
                title="${isWishlisted ? 'Remove from wishlist' : 'Save for later'}">
                <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart" ${isWishlisted ? 'style="color:#ef4444;"' : ''}></i>
              </button>
              <button type="button" class="btn-card-action" 
                onclick="window.EiTohApp.openQuickView('${E(p.id)}')" 
                aria-label="Quick preview"
                title="Quick preview">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>

          <div class="card-body">
            <div class="card-category-row">
              <span class="card-cat-name">${E(catName)}</span>
              <div class="card-rating">
                <i class="fa-solid fa-star"></i>
                <span>${p.rating ? p.rating.toFixed(1) : '5.0'}</span>
              </div>
            </div>

            <h3 class="card-title" onclick="window.EiTohApp.openQuickView('${E(p.id)}')">
              ${E(p.title)}
            </h3>
            ${p.banglaTitle ? `<div class="card-bangla-title bangla-text">${E(p.banglaTitle)}</div>` : ''}

            <p class="card-desc">${E(p.shortDescription || p.description || '')}</p>

            ${(p.tags && p.tags.length > 0) ? `
              <div class="card-tags">
                ${p.tags.slice(0, 3).map(t => `<span class="card-tag">${E(t)}</span>`).join('')}
              </div>
            ` : ''}

            <div class="card-footer">
              <div class="card-pricing">
                <span class="card-current-price">${StorageManager.formatPrice(p.price)}</span>
                ${p.originalPrice ? `<span class="card-orig-price">${StorageManager.formatPrice(p.originalPrice)}</span>` : ''}
              </div>

              <button type="button" class="btn-add-cart" 
                onclick="window.EiTohApp.quickAddToCart('${E(p.id)}', event)"
                ${(!isStock && !isMadeToOrder) ? 'disabled' : ''} 
                aria-label="Add ${E(p.title)} to cart">
                <i class="fa-solid fa-bag-shopping"></i>
                <span>Add</span>
              </button>
            </div>
          </div>
        </article>
      `;
    });

    elements.productGrid.innerHTML = html;
  }

  // =========================================================================
  // QUICK VIEW MODAL
  // =========================================================================
  function openQuickView(productId) {
    const product = StorageManager.getProductById(productId);
    const categories = StorageManager.getCategories();
    if (!product) return;

    state.modalProduct = product;
    state.modalQty = 1;
    state.modalSelectedColor = product.colors && product.colors.length > 0 ? product.colors[0] : null;

    const imgSrc = product.image || (product.images && product.images[0]) || 'assets/logo.jpg';
    if (elements.modalImg) {
      elements.modalImg.src = imgSrc;
      elements.modalImg.alt = product.title;
    }

    const cat = categories.find(c => c.id === product.category);
    if (elements.modalCategory) elements.modalCategory.textContent = cat ? cat.name : (product.category || 'Creations');

    const isStock = product.stockStatus === 'in_stock' || product.inStock === true;
    const isMadeToOrder = product.stockStatus === 'made_to_order';
    if (elements.modalStockBadge) {
      elements.modalStockBadge.textContent = isStock ? 'In Stock' : (isMadeToOrder ? 'Made to Order' : 'Out of Stock');
      elements.modalStockBadge.className = `modal-stock-badge ${isStock ? 'in-stock' : (isMadeToOrder ? 'pre-order' : 'out-of-stock')}`;
    }
    if (elements.modalTitle) elements.modalTitle.textContent = product.title;
    if (elements.modalBanglaTitle) {
      elements.modalBanglaTitle.textContent = product.banglaTitle || '';
      elements.modalBanglaTitle.style.display = product.banglaTitle ? 'block' : 'none';
    }
    if (elements.modalCurrentPrice) elements.modalCurrentPrice.textContent = StorageManager.formatPrice(product.price);
    if (elements.modalOrigPrice) {
      elements.modalOrigPrice.textContent = product.originalPrice ? StorageManager.formatPrice(product.originalPrice) : '';
    }
    if (elements.modalDiscountTag) {
      if (product.originalPrice && product.originalPrice > product.price) {
        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        elements.modalDiscountTag.textContent = `Save ${discount}%`;
        elements.modalDiscountTag.style.display = 'inline-block';
      } else {
        elements.modalDiscountTag.style.display = 'none';
      }
    }
    if (elements.modalRating) elements.modalRating.textContent = product.rating ? product.rating.toFixed(1) : '5.0';
    if (elements.modalReviews) elements.modalReviews.textContent = `(${product.reviewsCount || 0} reviews)`;
    if (elements.modalDesc) elements.modalDesc.textContent = product.description || product.shortDescription || '';

    // Specifications Table (supports both flat and specs object)
    if (elements.modalSpecsTable) {
      const specs = product.specs || {};
      const material = product.material || specs.material;
      const printTime = product.printTime || specs.printTime;
      const weight = product.weight || specs.weight;
      const dimensions = product.dimensions || specs.dimensions || specs.cubeSize || specs.curvedArc || specs.height;
      const layer = product.layerHeight || specs.layerHeight || specs.finish;

      let specsHtml = '';
      if (material) specsHtml += `<tr><td>Material</td><td>${E(material)}</td></tr>`;
      if (printTime) specsHtml += `<tr><td>Print Time</td><td>${E(printTime)}</td></tr>`;
      if (weight) specsHtml += `<tr><td>Weight</td><td>${E(weight)}</td></tr>`;
      if (dimensions) specsHtml += `<tr><td>Dimensions</td><td>${E(dimensions)}</td></tr>`;
      if (layer) specsHtml += `<tr><td>Layer / Finish</td><td>${E(layer)}</td></tr>`;
      elements.modalSpecsTable.innerHTML = specsHtml || '<tr><td colspan="2">Standard Studio Precision (0.20mm)</td></tr>';
    }

    // Color Selector
    if (elements.modalVariantContainer && elements.modalColorPills) {
      if (product.colors && product.colors.length > 0) {
        elements.modalVariantContainer.style.display = 'block';
        let colorHtml = '';
        product.colors.forEach((col, idx) => {
          const isActive = idx === 0 ? 'active' : '';
          colorHtml += `
            <button type="button" class="color-pill-btn ${isActive}" data-color="${E(col)}">
              ${E(col)}
            </button>
          `;
        });
        elements.modalColorPills.innerHTML = colorHtml;

        elements.modalColorPills.querySelectorAll('.color-pill-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            elements.modalColorPills.querySelectorAll('.color-pill-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.modalSelectedColor = btn.dataset.color;
          });
        });
      } else {
        elements.modalVariantContainer.style.display = 'none';
      }
    }

    // Wishlist Button State
    const isWishlisted = StorageManager.isInWishlist ? StorageManager.isInWishlist(product.id) : false;
    if (elements.modalWishlistIcon) {
      elements.modalWishlistIcon.className = isWishlisted ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      if (isWishlisted) elements.modalWishlistIcon.style.color = '#ef4444';
      else elements.modalWishlistIcon.style.color = '';
    }

    if (elements.modalQtyDisplay) elements.modalQtyDisplay.textContent = state.modalQty;

    // Show Modal
    if (elements.quickViewModal) {
      elements.quickViewModal.classList.add('open');
      elements.quickViewModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      state.modalUntrapFn = trapFocus(elements.quickViewModal);
      announce(`Viewing product: ${product.title}`);
    }
  }

  function closeQuickView() {
    if (elements.quickViewModal) {
      elements.quickViewModal.classList.remove('open');
      elements.quickViewModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (typeof state.modalUntrapFn === 'function') {
        state.modalUntrapFn();
        state.modalUntrapFn = null;
      }
    }
  }

  // =========================================================================
  // SHOPPING CART & DUAL-PATH CHECKOUT
  // =========================================================================
  function openCartDrawer() {
    updateCartUI();
    setCheckoutStep(1);
    if (elements.cartOverlay) {
      elements.cartOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      state.cartUntrapFn = trapFocus(elements.cartOverlay);
      announce('Shopping cart opened');
    }
  }

  function closeCartDrawer() {
    if (elements.cartOverlay) {
      elements.cartOverlay.classList.remove('open');
      document.body.style.overflow = '';
      if (typeof state.cartUntrapFn === 'function') {
        state.cartUntrapFn();
        state.cartUntrapFn = null;
      }
    }
  }

  function setCheckoutStep(step) {
    state.checkoutStep = step;

    // Update Steps Bar Indicator
    if (elements.checkoutStepsBar) {
      elements.checkoutStepsBar.querySelectorAll('.checkout-step').forEach(s => {
        const stepNum = parseInt(s.dataset.step, 10);
        if (stepNum < step) {
          s.className = 'checkout-step completed';
        } else if (stepNum === step) {
          s.className = 'checkout-step active';
        } else {
          s.className = 'checkout-step';
        }
      });
    }

    // Toggle panels
    if (elements.checkoutStep1) elements.checkoutStep1.classList.toggle('active', step === 1);
    if (elements.checkoutStep2) elements.checkoutStep2.classList.toggle('active', step === 2);
    if (elements.checkoutStep3) elements.checkoutStep3.classList.toggle('active', step === 3);

    // Toggle footer navigation rows
    const navStep1 = document.querySelector('.checkout-nav-step[data-for-step="1"]');
    const navStep2 = document.querySelector('.checkout-nav-step[data-for-step="2"]');

    if (step === 3) {
      // Order completed: hide standard cart totals/footer
      if (elements.cartDrawerFooter) elements.cartDrawerFooter.style.display = 'none';
    } else {
      if (elements.cartDrawerFooter) elements.cartDrawerFooter.style.display = 'block';
      if (navStep1) navStep1.style.display = step === 1 ? 'block' : 'none';
      if (navStep2) navStep2.style.display = step === 2 ? 'flex' : 'none';
    }

    // Scroll to top of drawer
    const drawer = elements.cartOverlay?.querySelector('.cart-drawer');
    if (drawer) drawer.scrollTop = 0;
  }

  function updateCartUI() {
    const cart = StorageManager.getCart();
    const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    // Header badge
    if (elements.headerCartCount) elements.headerCartCount.textContent = totalCount;
    if (elements.drawerCartCount) elements.drawerCartCount.textContent = totalCount;

    // Cart Items Rendering
    if (!elements.cartDrawerBody) return;

    if (cart.length === 0) {
      elements.cartDrawerBody.innerHTML = `
        <div class="cart-empty-state">
          <i class="fa-solid fa-basket-shopping"></i>
          <h4>Your cart is empty</h4>
          <p>Explore our bespoke 3D creations, dragons, and lamps to add something unique.</p>
          <button type="button" class="btn-editorial-dark" onclick="window.EiTohApp.closeCart();">
            Start Exploring
          </button>
        </div>
      `;
      if (elements.btnToStep2) elements.btnToStep2.disabled = true;
      resetTotals();
      return;
    }

    if (elements.btnToStep2) elements.btnToStep2.disabled = false;

    let itemsHtml = '';
    let subtotal = 0;

    cart.forEach(item => {
      const itemSub = (item.price || 0) * (item.quantity || 1);
      subtotal += itemSub;

      itemsHtml += `
        <div class="cart-item-row" data-id="${E(item.cartItemId)}">
          <img src="${E(item.image)}" alt="${E(item.title)}" class="cart-item-img">
          <div class="cart-item-details">
            <div class="cart-item-title">${E(item.title)}</div>
            ${item.selectedColor ? `<div class="cart-item-variant">Color: <strong>${E(item.selectedColor)}</strong></div>` : ''}
            <div class="cart-item-price-line">
              <span>${StorageManager.formatPrice(item.price)}</span>
              <span class="mono-text" style="color: var(--text-light); font-size: 0.8rem;">× ${item.quantity} = ${StorageManager.formatPrice(itemSub)}</span>
            </div>
          </div>
          <div class="cart-item-actions">
            <div class="cart-qty-pill">
              <button type="button" onclick="window.EiTohApp.changeCartQty('${E(item.cartItemId)}', ${item.quantity - 1})" aria-label="Decrease quantity">
                <i class="fa-solid fa-minus"></i>
              </button>
              <span>${item.quantity}</span>
              <button type="button" onclick="window.EiTohApp.changeCartQty('${E(item.cartItemId)}', ${item.quantity + 1})" aria-label="Increase quantity">
                <i class="fa-solid fa-plus"></i>
              </button>
            </div>
            <button type="button" class="btn-remove-cart-item" onclick="window.EiTohApp.removeCartItem('${E(item.cartItemId)}')" aria-label="Remove item">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    });

    elements.cartDrawerBody.innerHTML = itemsHtml;

    // Calculate totals & discounts
    calculateAndRenderTotals(subtotal);
  }

  function calculateAndRenderTotals(subtotal) {
    const settings = StorageManager.getSettings();

    // Delivery Rate
    let deliveryRate = 70;
    if (state.selectedDeliveryArea === 'outside') {
      deliveryRate = settings.outsideDelivery || 130;
    } else if (state.selectedDeliveryArea === 'pickup') {
      deliveryRate = 0;
    } else {
      deliveryRate = settings.insideDelivery || 70;
    }

    // Free delivery check
    const isFreeDelivery = settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold;
    const finalDelivery = isFreeDelivery ? 0 : deliveryRate;

    // Coupon discount calculation
    let discountAmount = 0;
    if (state.appliedCoupon) {
      const res = StorageManager.validateCoupon(state.appliedCoupon.code, subtotal);
      if (res.valid) {
        discountAmount = res.discount;
      } else {
        // Coupon no longer meets minimum spend
        state.appliedCoupon = null;
        if (elements.couponFeedback) {
          elements.couponFeedback.className = 'coupon-feedback error';
          elements.couponFeedback.textContent = res.message;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - discountAmount + finalDelivery);

    if (elements.cartSubtotal) elements.cartSubtotal.textContent = StorageManager.formatPrice(subtotal);

    if (elements.cartDiscountLine && elements.cartDiscount) {
      if (discountAmount > 0) {
        elements.cartDiscountLine.style.display = 'flex';
        elements.cartDiscount.textContent = `- ${StorageManager.formatPrice(discountAmount)}`;
      } else {
        elements.cartDiscountLine.style.display = 'none';
      }
    }

    if (elements.cartDeliveryCharge) {
      if (state.selectedDeliveryArea === 'pickup') {
        elements.cartDeliveryCharge.textContent = 'FREE (Pickup)';
      } else if (isFreeDelivery) {
        elements.cartDeliveryCharge.textContent = 'FREE (Over ৳2,500)';
      } else {
        elements.cartDeliveryCharge.textContent = StorageManager.formatPrice(finalDelivery);
      }
    }

    if (elements.cartGrandTotal) elements.cartGrandTotal.textContent = StorageManager.formatPrice(grandTotal);
  }

  function resetTotals() {
    if (elements.cartSubtotal) elements.cartSubtotal.textContent = '৳ 0';
    if (elements.cartDiscountLine) elements.cartDiscountLine.style.display = 'none';
    if (elements.cartDeliveryCharge) elements.cartDeliveryCharge.textContent = '৳ 70';
    if (elements.cartGrandTotal) elements.cartGrandTotal.textContent = '৳ 70';
  }

  function validateCheckoutForm() {
    const name = elements.checkoutName?.value.trim();
    const phone = elements.checkoutPhone?.value.trim();
    const address = elements.checkoutAddress?.value.trim();

    if (!name) {
      showToast('Please enter your Full Name', 'warning');
      elements.checkoutName?.focus();
      return false;
    }

    const cleanPhone = (phone || '').replace(/[\s\-()]/g, '');
    const bdPhoneRegex = /^(?:\+8801|01)[3-9]\d{8}$/;
    if (!cleanPhone || !bdPhoneRegex.test(cleanPhone)) {
      showToast('Please enter a valid Bangladeshi Phone / WhatsApp number (e.g. 017XXXXXXXX or +88017XXXXXXXX)', 'warning');
      elements.checkoutPhone?.focus();
      return false;
    }

    if (state.selectedDeliveryArea !== 'pickup' && (!address || address.length < 5)) {
      showToast('Please enter your full Delivery Address', 'warning');
      elements.checkoutAddress?.focus();
      return false;
    }

    return true;
  }

  /**
   * Traditional Online Order Flow:
   * 1. Validates details
   * 2. Saves order into StorageManager orders database
   * 3. Clears customer's cart
   * 4. Transitions to Step 3 Confirmation with printable receipt & tracking ID
   */
  async function handlePlaceOrderOnline() {
    if (!validateCheckoutForm()) return;

    const cart = StorageManager.getCart();
    if (cart.length === 0) {
      showToast('Your cart is empty!');
      return;
    }

    const btn = elements.btnPlaceOrderOnline;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...';
    }

    try {
      const orderData = buildOrderPayload('online');
      const createdOrder = await StorageManager.saveOrder(orderData);
      state.lastPlacedOrder = createdOrder;

      // Clear cart and show confirmation screen
      StorageManager.clearCart();
      updateCartUI();
      renderOrderConfirmation(createdOrder);
      setCheckoutStep(3);

      showToast(`Order #${createdOrder.id} placed successfully! 🎉`);
      announce(`Order placed successfully. Your order ID is ${createdOrder.id}`);
    } catch (err) {
      console.error('Order placement error:', err);
      showToast('Failed to place order. Please try again.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText || '<i class="fa-solid fa-bag-shopping"></i> Place Order (Cash on Delivery)';
      }
    }
  }

  /**
   * WhatsApp Order Flow:
   * 1. Validates details
   * 2. Saves order in StorageManager with status 'pending' (so admin can track it!)
   * 3. Formats immaculate WhatsApp dispatch message
   * 4. Opens WhatsApp in new tab
   * 5. Clears customer cart and shows Confirmation screen
   */
  async function handleWhatsappCheckout() {
    if (!validateCheckoutForm()) return;

    const cart = StorageManager.getCart();
    if (cart.length === 0) {
      showToast('Your cart is empty!');
      return;
    }

    const btn = elements.btnWhatsappCheckout;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connecting WhatsApp...';
    }

    try {
      const orderData = buildOrderPayload('whatsapp');
      const createdOrder = await StorageManager.saveOrder(orderData);
      state.lastPlacedOrder = createdOrder;

      const settings = StorageManager.getSettings();
      const waUrl = buildWhatsAppURL(settings.whatsappNumber || '8801777547605', createdOrder, settings);

      // Open WhatsApp
      window.open(waUrl, '_blank');

      // Clear cart and show confirmation
      StorageManager.clearCart();
      updateCartUI();
      renderOrderConfirmation(createdOrder);
      setCheckoutStep(3);

      showToast('Redirecting to WhatsApp with your order! 🚀');
      announce(`Order saved! Redirecting to WhatsApp for order ${createdOrder.id}`);
    } catch (err) {
      console.error('WhatsApp order placement error:', err);
      showToast('Failed to process WhatsApp order. Please try again.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText || '<i class="fa-brands fa-whatsapp"></i> Order via WhatsApp';
      }
    }
  }

  function buildOrderPayload(channel = 'online') {
    const cart = StorageManager.getCart();
    const settings = StorageManager.getSettings();

    let subtotal = 0;
    const items = cart.map(item => {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 1);
      const itemSub = price * qty;
      subtotal += itemSub;

      return {
        id: item.id,
        title: item.title,
        price: price,
        quantity: qty,
        selectedColor: item.selectedColor || 'Standard',
        image: item.image || ''
      };
    });

    let deliveryRate = 70;
    if (state.selectedDeliveryArea === 'outside') {
      deliveryRate = settings.outsideDelivery || 130;
    } else if (state.selectedDeliveryArea === 'pickup') {
      deliveryRate = 0;
    } else {
      deliveryRate = settings.insideDelivery || 70;
    }

    const isFree = settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold;
    const deliveryFee = isFree ? 0 : deliveryRate;

    let discount = 0;
    let couponCode = null;
    if (state.appliedCoupon) {
      const res = StorageManager.validateCoupon(state.appliedCoupon.code, subtotal);
      if (res.valid) {
        discount = res.discount;
        couponCode = state.appliedCoupon.code;
      }
    }

    const total = Math.max(0, subtotal - discount + deliveryFee);

    return {
      customer: {
        name: elements.checkoutName?.value.trim() || 'Valued Customer',
        phone: elements.checkoutPhone?.value.trim() || '',
        address: state.selectedDeliveryArea === 'pickup' ? 'Store Pickup (Mirpur DOHS, Dhaka)' : (elements.checkoutAddress?.value.trim() || ''),
        deliveryArea: state.selectedDeliveryArea,
        notes: elements.checkoutNotes?.value.trim() || ''
      },
      items: items,
      subtotal: subtotal,
      discount: discount,
      couponCode: couponCode,
      deliveryFee: deliveryFee,
      total: total,
      channel: channel
    };
  }

  function renderOrderConfirmation(order) {
    if (!elements.orderConfirmationWrap) return;

    elements.orderConfirmationWrap.innerHTML = `
      <div class="confirmation-card">
        <div class="confirmation-badge-icon">
          <i class="fa-solid fa-circle-check"></i>
        </div>
        <h3 class="confirmation-title">Order Placed Successfully!</h3>
        <p class="confirmation-subtitle">
          Thank you for choosing EiToh. Your order is registered in our production queue.
        </p>

        <div class="confirmation-order-id-box">
          <div class="id-label">YOUR ORDER ID</div>
          <div class="id-code mono-text">${E(order.id)}</div>
          <button type="button" class="btn-copy-id" onclick="window.EiTohApp.copyOrderId('${E(order.id)}')">
            <i class="fa-regular fa-copy"></i> Copy ID
          </button>
        </div>

        <div class="confirmation-details-list">
          <div class="detail-row">
            <span>Customer:</span>
            <strong>${E(order.customer.name)}</strong>
          </div>
          <div class="detail-row">
            <span>Phone:</span>
            <strong>${E(order.customer.phone)}</strong>
          </div>
          <div class="detail-row">
            <span>Delivery:</span>
            <strong>${order.customer.deliveryArea === 'pickup' ? 'Store Pickup' : (order.customer.deliveryArea === 'outside' ? 'Outside Dhaka' : 'Inside Dhaka')}</strong>
          </div>
          <div class="detail-row">
            <span>Total Payable:</span>
            <strong class="mono-text" style="color: var(--primary); font-size: 1.1rem;">${StorageManager.formatPrice(order.total)}</strong>
          </div>
          <div class="detail-row">
            <span>Status:</span>
            <span class="status-chip pending"><i class="fa-solid fa-clock"></i> Pending Confirmation</span>
          </div>
        </div>

        <div class="confirmation-actions-row">
          <button type="button" class="btn-editorial-dark" onclick="window.EiTohApp.openReceipt('${E(order.id)}')">
            <i class="fa-solid fa-receipt"></i> View Full Receipt
          </button>
          <button type="button" class="btn-editorial-outline" onclick="window.EiTohApp.trackOrderDirect('${E(order.id)}')">
            <i class="fa-solid fa-route"></i> Track Order
          </button>
        </div>

        <div style="margin-top: 24px; text-align: center;">
          <a href="javascript:void(0)" onclick="window.EiTohApp.closeCart();" style="color: var(--text-light); font-size: 0.9rem; text-decoration: underline;">
            Return to Creations Catalog
          </a>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 3D PRINT COST ESTIMATOR ENGINE
  // =========================================================================
  function initEstimator() {
    updateEstimator();

    const inputs = [elements.estLength, elements.estWidth, elements.estHeight, elements.estMaterial, elements.estQuality];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', updateEstimator);
        input.addEventListener('change', updateEstimator);
      }
    });

    if (elements.estInfill) {
      elements.estInfill.addEventListener('input', (e) => {
        if (elements.estInfillVal) elements.estInfillVal.textContent = `${e.target.value}%`;
        updateEstimator();
      });
    }

    // Estimator WhatsApp Action
    if (elements.btnEstimatorWhatsApp) {
      elements.btnEstimatorWhatsApp.addEventListener('click', handleEstimatorWhatsApp);
    }

    // Estimator Save Quote Action
    if (elements.btnEstimatorSaveQuote) {
      elements.btnEstimatorSaveQuote.addEventListener('click', handleEstimatorSaveQuote);
    }
  }

  function getEstimatorParams() {
    return {
      length: parseFloat(elements.estLength?.value || 10),
      width: parseFloat(elements.estWidth?.value || 8),
      height: parseFloat(elements.estHeight?.value || 12),
      material: elements.estMaterial?.value || 'silk_pla',
      infill: parseInt(elements.estInfill?.value || 20, 10),
      quality: elements.estQuality?.value || 'standard'
    };
  }

  function updateEstimator() {
    const params = getEstimatorParams();
    const result = StorageManager.calculate3DPrintEstimate(params);

    if (elements.estPriceDisplay) elements.estPriceDisplay.textContent = StorageManager.formatPrice(result.price);
    if (elements.estWeightDisplay) elements.estWeightDisplay.textContent = `${result.weightGrams}g`;
    if (elements.estTimeDisplay) elements.estTimeDisplay.textContent = `${result.printTimeHours} hrs`;
    if (elements.estVolumeDisplay) elements.estVolumeDisplay.textContent = `${result.volumeCm3} cm³`;

    const materialName = elements.estMaterial?.options[elements.estMaterial.selectedIndex]?.text.split('—')[0].trim() || 'Silk PLA';
    if (elements.estMaterialDisplay) elements.estMaterialDisplay.textContent = materialName;
  }

  function handleEstimatorWhatsApp() {
    const params = getEstimatorParams();
    const result = StorageManager.calculate3DPrintEstimate(params);
    const settings = StorageManager.getSettings();

    const cleanNum = (settings.whatsappNumber || '8801777547605').replace(/[^0-9]/g, '');
    let msg = `🛠️ *CUSTOM 3D PRINT INQUIRY — EiToh (এইতো)*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📏 *Dimensions:* ${params.length} × ${params.width} × ${params.height} cm\n`;
    msg += `🧊 *Volume:* ~${result.volumeCm3} cm³\n`;
    msg += `🧵 *Material:* ${params.material.toUpperCase()}\n`;
    msg += `🕸️ *Infill Density:* ${params.infill}%\n`;
    msg += `💎 *Quality Level:* ${params.quality.toUpperCase()}\n`;
    msg += `⚖️ *Est. Weight:* ~${result.weightGrams}g\n`;
    msg += `⏱️ *Est. Print Time:* ~${result.printTimeHours} hours\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💰 *Calculated Price:* *${StorageManager.formatPrice(result.price)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📎 I have a 3D model (STL/OBJ/STEP) or photo reference ready to send for review!`;

    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function handleEstimatorSaveQuote() {
    const params = getEstimatorParams();
    const result = StorageManager.calculate3DPrintEstimate(params);

    const quote = {
      dimensions: `${params.length}x${params.width}x${params.height} cm`,
      material: params.material,
      infill: params.infill,
      quality: params.quality,
      estimatedWeight: result.weightGrams,
      estimatedHours: result.printTimeHours,
      estimatedPrice: result.price
    };

    if (StorageManager.saveCustomQuote) {
      StorageManager.saveCustomQuote(quote);
      showToast('Custom quote saved to your account! 📑');
    } else {
      showToast('Quote saved!');
    }
  }

  // =========================================================================
  // ORDER TRACKER MODAL
  // =========================================================================
  function openOrderTracker(prefillId = '') {
    if (elements.trackerModal) {
      elements.trackerModal.classList.add('open');
      elements.trackerModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      state.trackerUntrapFn = trapFocus(elements.trackerModal);

      if (prefillId && elements.trackerSearchInput) {
        elements.trackerSearchInput.value = prefillId;
        searchOrders(prefillId);
      } else {
        if (elements.trackerSearchInput) elements.trackerSearchInput.value = '';
        if (elements.trackerResults) elements.trackerResults.innerHTML = '';
      }
    }
  }

  function closeOrderTracker() {
    if (elements.trackerModal) {
      elements.trackerModal.classList.remove('open');
      elements.trackerModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (typeof state.trackerUntrapFn === 'function') {
        state.trackerUntrapFn();
        state.trackerUntrapFn = null;
      }
    }
  }

  function searchOrders(queryOverride) {
    const q = (queryOverride || elements.trackerSearchInput?.value || '').trim();
    if (!q) {
      showToast('Please enter an Order ID or phone number');
      return;
    }

    const orders = StorageManager.findOrdersByCustomer ? StorageManager.findOrdersByCustomer(q) : [];

    if (!elements.trackerResults) return;

    if (orders.length === 0) {
      elements.trackerResults.innerHTML = `
        <div class="tracker-empty">
          <i class="fa-solid fa-magnifying-glass"></i>
          <h4>No orders found</h4>
          <p>We couldn't locate any order matching "${E(q)}". Please double-check your Order ID or phone number.</p>
        </div>
      `;
      return;
    }

    let html = '';
    orders.forEach(order => {
      const steps = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered'];
      const currentIndex = steps.indexOf(order.status || 'pending');

      html += `
        <div class="tracker-order-card">
          <div class="tracker-order-header">
            <div>
              <span class="tracker-order-id mono-text">${E(order.id)}</span>
              <span class="tracker-order-date">${E(window.EiTohUtils?.formatDate(order.createdAt) || '')}</span>
            </div>
            <span class="status-chip ${E(order.status || 'pending')}">
              ${E((order.status || 'pending').replace('_', ' ').toUpperCase())}
            </span>
          </div>

          <!-- Progress Timeline -->
          <div class="tracker-timeline">
            <div class="timeline-step ${currentIndex >= 0 ? 'active' : ''}">
              <div class="step-circle"><i class="fa-solid fa-receipt"></i></div>
              <span class="step-text">Placed</span>
            </div>
            <div class="timeline-step ${currentIndex >= 1 ? 'active' : ''}">
              <div class="step-circle"><i class="fa-solid fa-check"></i></div>
              <span class="step-text">Confirmed</span>
            </div>
            <div class="timeline-step ${currentIndex >= 2 ? 'active' : ''}">
              <div class="step-circle"><i class="fa-solid fa-cube"></i></div>
              <span class="step-text">Printing</span>
            </div>
            <div class="timeline-step ${currentIndex >= 3 ? 'active' : ''}">
              <div class="step-circle"><i class="fa-solid fa-truck"></i></div>
              <span class="step-text">Shipped</span>
            </div>
            <div class="timeline-step ${currentIndex >= 4 ? 'active' : ''}">
              <div class="step-circle"><i class="fa-solid fa-box-open"></i></div>
              <span class="step-text">Delivered</span>
            </div>
          </div>

          <!-- Items list -->
          <div class="tracker-order-items">
            ${(order.items || []).map(it => `
              <div class="tracker-item-row">
                <span>${E(it.title)} (${E(it.selectedColor || 'Standard')}) × ${it.quantity}</span>
                <span class="mono-text">${StorageManager.formatPrice(it.price * it.quantity)}</span>
              </div>
            `).join('')}
          </div>

          <div class="tracker-order-footer">
            <div class="tracker-total">
              <span>Total:</span>
              <strong class="mono-text">${StorageManager.formatPrice(order.total)}</strong>
            </div>
            <div class="tracker-actions">
              <button type="button" class="btn-editorial-outline btn-sm" onclick="window.EiTohApp.openReceipt('${E(order.id)}')">
                <i class="fa-solid fa-file-invoice"></i> Receipt
              </button>
            </div>
          </div>
        </div>
      `;
    });

    elements.trackerResults.innerHTML = html;
  }

  // =========================================================================
  // PRINTABLE RECEIPT MODAL
  // =========================================================================
  function openReceipt(orderId) {
    const order = StorageManager.getOrder(orderId);
    if (!order) {
      showToast('Order not found!');
      return;
    }

    if (!elements.receiptContent) return;

    const settings = StorageManager.getSettings();
    const formattedDate = window.EiTohUtils?.formatDate(order.createdAt) || new Date().toLocaleString();

    let itemsRows = '';
    (order.items || []).forEach((it, idx) => {
      const itemSub = (it.price || 0) * (it.quantity || 1);
      itemsRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${E(it.title)}</strong><br>
            <span style="font-size: 0.8rem; color: #64748b;">Option: ${E(it.selectedColor || 'Standard')}</span>
          </td>
          <td style="text-align: center;">${it.quantity}</td>
          <td style="text-align: right;" class="mono-text">${StorageManager.formatPrice(it.price)}</td>
          <td style="text-align: right;" class="mono-text">${StorageManager.formatPrice(itemSub)}</td>
        </tr>
      `;
    });

    elements.receiptContent.innerHTML = `
      <div class="printable-invoice" id="printableInvoice">
        <div class="invoice-header">
          <div class="invoice-brand">
            <h2>EiToh (এইতো)</h2>
            <div class="invoice-sub">Precision 3D Printing & Maker Studio</div>
            <div class="invoice-meta">Dhaka, Bangladesh • WhatsApp: +880 1777-547605</div>
          </div>
          <div class="invoice-tag">
            <div class="invoice-number mono-text">RECEIPT</div>
            <div class="invoice-id mono-text">${E(order.id)}</div>
            <div class="invoice-date">${E(formattedDate)}</div>
          </div>
        </div>

        <div class="invoice-parties">
          <div class="party-col">
            <span class="party-label">BILLED TO:</span>
            <strong>${E(order.customer.name)}</strong>
            <div>${E(order.customer.phone)}</div>
            <div>${E(order.customer.address || 'Dhaka, Bangladesh')}</div>
          </div>
          <div class="party-col">
            <span class="party-label">ORDER STATUS:</span>
            <div style="margin-top: 4px;">
              <span class="status-chip ${E(order.status || 'pending')}">
                ${E((order.status || 'pending').replace('_', ' ').toUpperCase())}
              </span>
            </div>
            <div style="margin-top: 8px; font-size: 0.85rem; color: #64748b;">
              Method: ${order.channel === 'whatsapp' ? 'WhatsApp Order' : 'Direct Online Order'}
            </div>
          </div>
        </div>

        <table class="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="invoice-summary-grid">
          <div class="invoice-notes-col">
            ${order.customer.notes ? `<p><strong>Special Note:</strong> ${E(order.customer.notes)}</p>` : ''}
            <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 12px;">
              Thank you for supporting artisanal 3D manufacturing in Bangladesh. Please inspect items upon delivery.
            </p>
          </div>
          <div class="invoice-totals-col">
            <div class="totals-line">
              <span>Items Subtotal:</span>
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

        <div class="invoice-footer">
          <div>EiToh 3D Studio — Quality & Precision Guaranteed</div>
          <div class="mono-text" style="font-size: 0.75rem;">Generated on ${new Date().toISOString()}</div>
        </div>
      </div>
    `;

    if (elements.receiptModal) {
      elements.receiptModal.classList.add('open');
      elements.receiptModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      state.receiptUntrapFn = trapFocus(elements.receiptModal);
    }
  }

  function closeReceipt() {
    if (elements.receiptModal) {
      elements.receiptModal.classList.remove('open');
      elements.receiptModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (typeof state.receiptUntrapFn === 'function') {
        state.receiptUntrapFn();
        state.receiptUntrapFn = null;
      }
    }
  }

  // =========================================================================
  // WISHLIST MANAGEMENT
  // =========================================================================
  function toggleWishlist(productId, event) {
    if (event) event.stopPropagation();
    if (!StorageManager.toggleWishlist) return;

    const isAdded = StorageManager.toggleWishlist(productId);
    updateWishlistBadge();

    // Update in product grid
    const cardBtn = document.querySelector(`.product-card[data-product-id="${productId}"] .card-wishlist-btn`);
    if (cardBtn) {
      cardBtn.classList.toggle('active', isAdded);
      const icon = cardBtn.querySelector('i');
      if (icon) icon.className = isAdded ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    }

    // Update in QuickView if open
    if (state.modalProduct && state.modalProduct.id === productId && elements.modalWishlistIcon) {
      elements.modalWishlistIcon.className = isAdded ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      elements.modalWishlistIcon.style.color = isAdded ? '#ef4444' : '';
    }

    showToast(isAdded ? 'Added to Saved Items! ❤️' : 'Removed from Saved Items');
  }

  function updateWishlistBadge() {
    const list = StorageManager.getWishlist ? StorageManager.getWishlist() : [];
    if (elements.wishlistCount) {
      elements.wishlistCount.textContent = list.length;
      elements.wishlistCount.style.display = list.length > 0 ? 'inline-flex' : 'none';
    }
  }

  function openWishlistModal() {
    const list = StorageManager.getWishlist ? StorageManager.getWishlist() : [];
    const products = StorageManager.getProducts();
    const wishlistedProducts = products.filter(p => list.includes(p.id));

    if (!elements.wishlistItems) return;

    if (wishlistedProducts.length === 0) {
      elements.wishlistItems.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
          <i class="fa-regular fa-heart" style="font-size: 2.5rem; margin-bottom: 12px; color: var(--border-color);"></i>
          <h4>No saved creations yet</h4>
          <p>Click the heart icon on any creation in our catalog to save it for later.</p>
        </div>
      `;
    } else {
      let html = '';
      wishlistedProducts.forEach(p => {
        html += `
          <div class="wishlist-item-row" data-id="${E(p.id)}">
            <img src="${E(p.image)}" alt="${E(p.title)}" class="wishlist-item-img">
            <div class="wishlist-item-info">
              <h4>${E(p.title)}</h4>
              <span class="mono-text" style="color: var(--primary); font-weight: 700;">${StorageManager.formatPrice(p.price)}</span>
            </div>
            <div class="wishlist-item-actions">
              <button type="button" class="btn-editorial-dark btn-sm" onclick="window.EiTohApp.quickAddToCart('${E(p.id)}'); window.EiTohApp.closeWishlist();">
                <i class="fa-solid fa-bag-shopping"></i> Add to Cart
              </button>
              <button type="button" class="btn-remove-wishlist" onclick="window.EiTohApp.toggleWishlist('${E(p.id)}'); window.EiTohApp.openWishlist();" title="Remove">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        `;
      });
      elements.wishlistItems.innerHTML = html;
    }

    if (elements.wishlistModal) {
      elements.wishlistModal.classList.add('open');
      elements.wishlistModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      state.wishlistUntrapFn = trapFocus(elements.wishlistModal);
    }
  }

  function closeWishlistModal() {
    if (elements.wishlistModal) {
      elements.wishlistModal.classList.remove('open');
      elements.wishlistModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (typeof state.wishlistUntrapFn === 'function') {
        state.wishlistUntrapFn();
        state.wishlistUntrapFn = null;
      }
    }
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  function bindEvents() {
    // Theme Toggle
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Studio Tools Dropdown Toggle
    if (elements.btnStudioTools) {
      elements.btnStudioTools.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = elements.studioDropdownMenu?.classList.toggle('open');
        elements.btnStudioTools.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });

      document.addEventListener('click', (e) => {
        if (elements.studioDropdownMenu?.classList.contains('open') && !elements.btnStudioTools.contains(e.target)) {
          elements.studioDropdownMenu.classList.remove('open');
          elements.btnStudioTools.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Mobile Navigation Slide-Over Handlers
    function openMobileNav() {
      if (elements.mobileNavOverlay) {
        elements.mobileNavOverlay.classList.add('open');
        elements.mobileNavOverlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
      if (elements.btnMobileNavToggle) {
        elements.btnMobileNavToggle.setAttribute('aria-expanded', 'true');
      }
    }

    function closeMobileNav() {
      if (elements.mobileNavOverlay) {
        elements.mobileNavOverlay.classList.remove('open');
        elements.mobileNavOverlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
      if (elements.btnMobileNavToggle) {
        elements.btnMobileNavToggle.setAttribute('aria-expanded', 'false');
      }
    }

    if (elements.btnMobileNavToggle) {
      elements.btnMobileNavToggle.addEventListener('click', openMobileNav);
    }
    if (elements.btnCloseMobileNav) {
      elements.btnCloseMobileNav.addEventListener('click', closeMobileNav);
    }
    if (elements.mobileNavOverlay) {
      elements.mobileNavOverlay.addEventListener('click', (e) => {
        if (e.target === elements.mobileNavOverlay) closeMobileNav();
      });
    }

    // Mobile Drawer Navigation Item Actions
    if (elements.mobileLinkCatalog) {
      elements.mobileLinkCatalog.addEventListener('click', () => closeMobileNav());
    }
    if (elements.mobileLinkEstimator) {
      elements.mobileLinkEstimator.addEventListener('click', () => closeMobileNav());
    }
    if (elements.mobileLinkTracker) {
      elements.mobileLinkTracker.addEventListener('click', () => {
        closeMobileNav();
        openOrderTracker();
      });
    }
    if (elements.mobileLinkWishlist) {
      elements.mobileLinkWishlist.addEventListener('click', () => {
        closeMobileNav();
        openWishlistModal();
      });
    }
    if (elements.mobileThemeToggleBtn) {
      elements.mobileThemeToggleBtn.addEventListener('click', () => {
        toggleTheme();
      });
    }
    if (elements.mobileSearchInput) {
      elements.mobileSearchInput.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        if (elements.searchInput) elements.searchInput.value = e.target.value;
        if (elements.searchClearBtn) elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
        renderProducts();
      }, 150));
    }

    // Custom Nav Link Scroll & Select
    if (elements.navCustomLink) {
      elements.navCustomLink.addEventListener('click', () => {
        const customCat = StorageManager.getCategories().find(c => c.id === 'fidget' || c.id === 'lamps');
        if (customCat) {
          state.selectedCategory = customCat.id;
          renderCategories();
          renderActiveFilterChips();
          renderProducts();
        }
      });
    }

    // Nav Links ScrollSpy Indicator
    const navAnchors = document.querySelectorAll('.header-nav-link');
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY + 140;
      const catalogEl = document.getElementById('catalogSection');
      const estimatorEl = document.getElementById('estimatorSection');

      let activeId = '';
      if (estimatorEl && scrollY >= estimatorEl.offsetTop && scrollY < estimatorEl.offsetTop + estimatorEl.offsetHeight) {
        activeId = 'estimatorSection';
      } else if (catalogEl && scrollY >= catalogEl.offsetTop) {
        activeId = 'catalogSection';
      }

      navAnchors.forEach(a => {
        const href = a.getAttribute('href') || '';
        if (activeId && href.includes(activeId)) {
          a.classList.add('active');
        } else if (activeId) {
          a.classList.remove('active');
        }
      });
    }, { passive: true });

    // Live Search with Debounce
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', debounce((e) => {
        state.searchQuery = e.target.value;
        if (elements.searchClearBtn) {
          elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
        renderProducts();
      }, 150));
    }

    if (elements.searchClearBtn) {
      elements.searchClearBtn.addEventListener('click', () => {
        if (elements.searchInput) elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClearBtn.style.display = 'none';
        renderProducts();
      });
    }

    // Sort Dropdown
    if (elements.sortSelect) {
      elements.sortSelect.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        renderProducts();
      });
    }

    // Filter Popover Toggle
    if (elements.btnFilterTrigger) {
      elements.btnFilterTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = elements.filterPopoverPanel?.classList.contains('open');
        if (isOpen) {
          elements.filterPopoverPanel?.classList.remove('open');
          elements.btnFilterTrigger.setAttribute('aria-expanded', 'false');
        } else {
          elements.filterPopoverPanel?.classList.add('open');
          elements.btnFilterTrigger.setAttribute('aria-expanded', 'true');
        }
      });
    }

    // Close Popover when clicking outside
    document.addEventListener('click', (e) => {
      if (elements.filterPopoverPanel?.classList.contains('open')) {
        if (!elements.filterPopoverPanel.contains(e.target) && !elements.btnFilterTrigger?.contains(e.target)) {
          elements.filterPopoverPanel.classList.remove('open');
          elements.btnFilterTrigger?.setAttribute('aria-expanded', 'false');
        }
      }
    });

    // Popover Category Selection
    if (elements.popoverCategoryGrid) {
      elements.popoverCategoryGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.popover-cat-btn');
        if (btn) {
          state.selectedCategory = btn.dataset.category;
          renderCategories();
          renderActiveFilterChips();
          renderProducts();
        }
      });
    }

    // Popover Tag Selection
    if (elements.popoverTagsGrid) {
      elements.popoverTagsGrid.addEventListener('click', (e) => {
        const chip = e.target.closest('.popover-tag-chip');
        if (chip) {
          state.selectedTag = chip.dataset.tag;
          renderActiveFilterChips();
          renderProducts();
        }
      });
    }

    // Reset Filters
    if (elements.btnClearFilters) {
      elements.btnClearFilters.addEventListener('click', resetAllFilters);
    }

    // Cart Trigger & Close
    if (elements.cartTriggerBtn) elements.cartTriggerBtn.addEventListener('click', openCartDrawer);
    if (elements.btnCloseCart) elements.btnCloseCart.addEventListener('click', closeCartDrawer);
    if (elements.cartOverlay) {
      elements.cartOverlay.addEventListener('click', (e) => {
        if (e.target === elements.cartOverlay) closeCartDrawer();
      });
    }

    // Checkout Navigation Steps
    if (elements.btnToStep2) {
      elements.btnToStep2.addEventListener('click', () => {
        const cart = StorageManager.getCart();
        if (cart.length === 0) {
          showToast('Your cart is empty!');
          return;
        }
        setCheckoutStep(2);
      });
    }

    if (elements.btnBackToStep1) {
      elements.btnBackToStep1.addEventListener('click', () => {
        setCheckoutStep(1);
      });
    }

    // Delivery Area Selection in Checkout
    if (elements.checkoutDeliveryArea) {
      elements.checkoutDeliveryArea.addEventListener('change', (e) => {
        state.selectedDeliveryArea = e.target.value;
        if (elements.checkoutAddressWrap) {
          elements.checkoutAddressWrap.style.display = state.selectedDeliveryArea === 'pickup' ? 'none' : 'block';
        }
        const cart = StorageManager.getCart();
        const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        calculateAndRenderTotals(subtotal);
      });
    }

    // Apply Coupon
    if (elements.btnApplyCoupon && elements.couponCodeInput) {
      elements.btnApplyCoupon.addEventListener('click', () => {
        const code = elements.couponCodeInput.value.trim().toUpperCase();
        if (!code) {
          showToast('Please enter a coupon code', 'warning');
          return;
        }

        const cart = StorageManager.getCart();
        const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        const res = StorageManager.validateCoupon(code, subtotal);

        if (res.valid) {
          state.appliedCoupon = res.coupon;
          if (elements.couponFeedback) {
            elements.couponFeedback.className = 'coupon-feedback success';
            elements.couponFeedback.textContent = `Coupon applied! You saved ${StorageManager.formatPrice(res.discount)}.`;
          }
          calculateAndRenderTotals(subtotal);
          showToast('Coupon applied successfully! 🏷️');
        } else {
          state.appliedCoupon = null;
          if (elements.couponFeedback) {
            elements.couponFeedback.className = 'coupon-feedback error';
            elements.couponFeedback.textContent = res.message;
          }
          calculateAndRenderTotals(subtotal);
        }
      });
    }

    // Dual-Path Checkout Actions
    if (elements.btnPlaceOrderOnline) {
      elements.btnPlaceOrderOnline.addEventListener('click', handlePlaceOrderOnline);
    }
    if (elements.btnWhatsappCheckout) {
      elements.btnWhatsappCheckout.addEventListener('click', handleWhatsappCheckout);
    }

    // Quick View Modal Controls
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeQuickView);
    if (elements.quickViewModal) {
      elements.quickViewModal.addEventListener('click', (e) => {
        if (e.target === elements.quickViewModal) closeQuickView();
      });
    }

    if (elements.btnModalDec) {
      elements.btnModalDec.addEventListener('click', () => {
        if (state.modalQty > 1) {
          state.modalQty--;
          if (elements.modalQtyDisplay) elements.modalQtyDisplay.textContent = state.modalQty;
        }
      });
    }

    if (elements.btnModalInc) {
      elements.btnModalInc.addEventListener('click', () => {
        state.modalQty++;
        if (elements.modalQtyDisplay) elements.modalQtyDisplay.textContent = state.modalQty;
      });
    }

    if (elements.btnModalAddToCart) {
      elements.btnModalAddToCart.addEventListener('click', () => {
        if (!state.modalProduct) return;
        StorageManager.addToCart(state.modalProduct, state.modalQty, state.modalSelectedColor);
        updateCartUI();
        closeQuickView();
        showToast(`Added ${state.modalProduct.title} to your cart! 🛍️`);
        openCartDrawer();
      });
    }

    if (elements.btnModalWishlist) {
      elements.btnModalWishlist.addEventListener('click', () => {
        if (!state.modalProduct) return;
        toggleWishlist(state.modalProduct.id);
      });
    }

    // Tracker Modal Controls
    if (elements.btnOpenTracker) elements.btnOpenTracker.addEventListener('click', () => openOrderTracker());
    if (elements.btnCloseTracker) elements.btnCloseTracker.addEventListener('click', closeOrderTracker);
    if (elements.btnTrackerSearch) elements.btnTrackerSearch.addEventListener('click', () => searchOrders());
    if (elements.trackerSearchInput) {
      elements.trackerSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchOrders();
      });
    }
    if (elements.trackerModal) {
      elements.trackerModal.addEventListener('click', (e) => {
        if (e.target === elements.trackerModal) closeOrderTracker();
      });
    }

    // Wishlist Modal Controls
    if (elements.btnOpenWishlist) elements.btnOpenWishlist.addEventListener('click', openWishlistModal);
    if (elements.btnCloseWishlist) elements.btnCloseWishlist.addEventListener('click', closeWishlistModal);
    if (elements.wishlistModal) {
      elements.wishlistModal.addEventListener('click', (e) => {
        if (e.target === elements.wishlistModal) closeWishlistModal();
      });
    }

    // Receipt Modal Controls
    if (elements.btnCloseReceipt) elements.btnCloseReceipt.addEventListener('click', closeReceipt);
    if (elements.btnPrintReceipt) {
      elements.btnPrintReceipt.addEventListener('click', () => {
        window.print();
      });
    }
    if (elements.receiptModal) {
      elements.receiptModal.addEventListener('click', (e) => {
        if (e.target === elements.receiptModal) closeReceipt();
      });
    }

    // Hero Custom Quote button
    if (elements.btnHeroCustomQuote) {
      elements.btnHeroCustomQuote.addEventListener('click', () => {
        const estSec = document.getElementById('estimatorSection');
        if (estSec) estSec.scrollIntoView({ behavior: 'smooth' });
      });
    }

    // Footer Category Filter Links
    document.querySelectorAll('.footer-cat-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.cat;
        state.selectedCategory = cat;
        renderCategories();
        renderActiveFilterChips();
        renderProducts();
        const catSec = document.getElementById('catalogSection');
        if (catSec) catSec.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Global ESC key listener to close active modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.quickViewModal?.classList.contains('open')) closeQuickView();
        if (elements.cartOverlay?.classList.contains('open')) closeCartDrawer();
        if (elements.trackerModal?.classList.contains('open')) closeOrderTracker();
        if (elements.wishlistModal?.classList.contains('open')) closeWishlistModal();
        if (elements.receiptModal?.classList.contains('open')) closeReceipt();
      }
    });
  }

  function resetAllFilters() {
    state.selectedCategory = 'all';
    state.selectedTag = 'all';
    state.searchQuery = '';
    state.sortBy = 'featured';

    if (elements.searchInput) elements.searchInput.value = '';
    if (elements.searchClearBtn) elements.searchClearBtn.style.display = 'none';
    if (elements.sortSelect) elements.sortSelect.value = 'featured';

    renderCategories();
    renderActiveFilterChips();
    renderProducts();

    if (elements.filterPopoverPanel) elements.filterPopoverPanel.classList.remove('open');
    if (elements.btnFilterTrigger) elements.btnFilterTrigger.setAttribute('aria-expanded', 'false');
  }

  // =========================================================================
  // PUBLIC API EXPOSURE (WINDOW.EITOHAPP)
  // =========================================================================
  window.EiTohApp = {
    openQuickView,
    closeQuickView,
    openCart: openCartDrawer,
    closeCart: closeCartDrawer,
    openOrderTracker,
    closeOrderTracker,
    trackOrderDirect: (orderId) => {
      closeCartDrawer();
      openOrderTracker(orderId);
    },
    openReceipt,
    closeReceipt,
    openWishlist: openWishlistModal,
    closeWishlist: closeWishlistModal,
    toggleWishlist,
    quickAddToCart: (productId, event) => {
      if (event) event.stopPropagation();
      const product = StorageManager.getProductById(productId);
      if (product) {
        StorageManager.addToCart(product, 1, product.colors ? product.colors[0] : null);
        updateCartUI();
        showToast(`Added ${product.title} to cart! 🛍️`);
      }
    },
    changeCartQty: (cartItemId, newQty) => {
      if (newQty <= 0) {
        StorageManager.removeFromCart(cartItemId);
      } else {
        StorageManager.updateCartQuantity(cartItemId, newQty);
      }
      updateCartUI();
    },
    removeCartItem: (cartItemId) => {
      StorageManager.removeFromCart(cartItemId);
      updateCartUI();
    },
    clearCategoryFilter: (event) => {
      if (event) event.stopPropagation();
      state.selectedCategory = 'all';
      renderCategories();
      renderActiveFilterChips();
      renderProducts();
    },
    clearTagFilter: (event) => {
      if (event) event.stopPropagation();
      state.selectedTag = 'all';
      renderActiveFilterChips();
      renderProducts();
    },
    resetAllFilters,
    copyOrderId: (orderId) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(orderId).then(() => {
          showToast(`Copied ${orderId} to clipboard! 📋`);
        }).catch(() => {
          showToast(`Order ID: ${orderId}`);
        });
      } else {
        showToast(`Order ID: ${orderId}`);
      }
    }
  };

  // Run initialization
  init();
});
