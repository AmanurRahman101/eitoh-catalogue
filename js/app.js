/**
 * EiToh (এইতো) - Customer Storefront & Catalog Controller
 * Powers product grid, live search, multi-category filters, modals, and WhatsApp checkout.
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    selectedCategory: 'all',
    selectedTag: 'all',
    searchQuery: '',
    sortBy: 'featured',
    selectedDeliveryArea: 'inside', // 'inside', 'outside', 'pickup'
    modalProduct: null,
    modalSelectedColor: null,
    modalQty: 1
  };

  // DOM Elements
  const elements = {
    // Header & Announcement
    topAnnouncement: document.getElementById('topAnnouncement'),
    announcementText: document.getElementById('announcementText'),
    brandTagline: document.getElementById('brandTagline'),
    searchInput: document.getElementById('searchInput'),
    searchClearBtn: document.getElementById('searchClearBtn'),
    headerCartCount: document.getElementById('headerCartCount'),
    cartTriggerBtn: document.getElementById('cartTriggerBtn'),
    headerWhatsappBtn: document.getElementById('headerWhatsappBtn'),
    footerWhatsappLink: document.getElementById('footerWhatsappLink'),

    // Hero
    heroShowcaseImg: document.getElementById('heroShowcaseImg'),
    heroShowcaseTitle: document.getElementById('heroShowcaseTitle'),
    heroShowcaseDesc: document.getElementById('heroShowcaseDesc'),
    heroShowcasePrice: document.getElementById('heroShowcasePrice'),
    btnHeroCustomQuote: document.getElementById('btnHeroCustomQuote'),

    // Categories & Filters (New Refined Bar)
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
    modalTitle: document.getElementById('modalTitle'),
    modalBanglaTitle: document.getElementById('modalBanglaTitle'),
    modalCurrentPrice: document.getElementById('modalCurrentPrice'),
    modalOrigPrice: document.getElementById('modalOrigPrice'),
    modalDesc: document.getElementById('modalDesc'),
    modalSpecsTable: document.getElementById('modalSpecsTable'),
    modalColorPills: document.getElementById('modalColorPills'),
    modalQtyDisplay: document.getElementById('modalQtyDisplay'),
    btnModalDec: document.getElementById('btnModalDec'),
    btnModalInc: document.getElementById('btnModalInc'),
    btnModalAddToCart: document.getElementById('btnModalAddToCart'),

    // Cart Drawer
    cartOverlay: document.getElementById('cartOverlay'),
    btnCloseCart: document.getElementById('btnCloseCart'),
    drawerCartCount: document.getElementById('drawerCartCount'),
    cartDrawerBody: document.getElementById('cartDrawerBody'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartDeliveryCharge: document.getElementById('cartDeliveryCharge'),
    cartGrandTotal: document.getElementById('cartGrandTotal'),
    btnWhatsappCheckout: document.getElementById('btnWhatsappCheckout'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  function init() {
    loadSettings();
    renderCategories();
    renderActiveFilterChips();
    renderProducts();
    updateCartUI();
    bindEvents();
  }

  function loadSettings() {
    const settings = StorageManager.getSettings();
    if (elements.announcementText && settings.announcement) {
      elements.announcementText.innerHTML = `✦ ${settings.announcement}`;
    }
    if (elements.brandTagline && settings.tagline) {
      elements.brandTagline.textContent = settings.tagline;
    }
    
    // WhatsApp direct links
    const cleanNumber = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent("Hello EiToh! I'm interested in custom 3D printing & orders.")}`;
    if (elements.headerWhatsappBtn) elements.headerWhatsappBtn.href = waUrl;
    if (elements.footerWhatsappLink) elements.footerWhatsappLink.href = waUrl;
  }

  // =========================================================================
  // CATEGORIES & FILTER LOGIC
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
        <button type="button" class="popover-cat-btn ${isActive}" data-category="${cat.id}">
          <span><i class="fa-solid ${cat.icon || 'fa-cube'}" style="margin-right: 6px; font-size: 0.75rem;"></i> ${cat.name}</span>
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
          <span>${catName}</span>
          <i class="fa-solid fa-xmark" onclick="window.EiTohApp.clearCategoryFilter(event)" title="Remove category"></i>
        </span>
      `;
    }

    if (state.selectedTag !== 'all') {
      activeFiltersCount++;
      const tagLabel = state.selectedTag === 'in_stock' ? 'In Stock' : state.selectedTag;
      chipsHtml += `
        <span class="active-filter-chip">
          <span>${tagLabel}</span>
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

    // Update popover tag chips active state
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

    // 2. Tag / Stock Status Filter
    if (state.selectedTag !== 'all') {
      if (state.selectedTag === 'in_stock') {
        products = products.filter(p => p.stockStatus === 'in_stock');
      } else {
        products = products.filter(p => 
          p.tags && p.tags.some(t => t.toLowerCase() === state.selectedTag.toLowerCase())
        );
      }
    }

    // 3. Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      products = products.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.banglaTitle && p.banglaTitle.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        (p.category && p.category.toLowerCase().includes(q))
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
        // Reversed insertion
        products.reverse();
        break;
      case 'featured':
      default:
        products.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return products;
  }

  // =========================================================================
  // PRODUCT GRID RENDERING
  // =========================================================================
  function renderProducts() {
    const products = getFilteredProducts();

    // Update count label
    if (elements.productCountLabel) {
      elements.productCountLabel.textContent = `Showing ${products.length} item${products.length === 1 ? '' : 's'}`;
    }

    if (!elements.productGrid) return;

    if (products.length === 0) {
      elements.productGrid.innerHTML = `
        <div class="catalog-empty-state" style="grid-column: 1 / -1;">
          <i class="fa-solid fa-box-open"></i>
          <h3>No creations found</h3>
          <p>We couldn't find any products matching your active filters or search terms.</p>
          <button type="button" class="btn-add-cart" id="btnResetFilters" style="margin: 0 auto;">
            <i class="fa-solid fa-rotate-left"></i> Reset All Filters
          </button>
        </div>
      `;
      document.getElementById('btnResetFilters')?.addEventListener('click', () => {
        state.selectedCategory = 'all';
        state.selectedTag = 'all';
        state.searchQuery = '';
        if (elements.searchInput) elements.searchInput.value = '';
        renderCategories();
        renderProducts();
      });
      return;
    }

    const categories = StorageManager.getCategories();

    let gridHtml = '';
    products.forEach(p => {
      const categoryObj = categories.find(c => c.id === p.category);
      const catName = categoryObj ? categoryObj.name : p.category;
      const img = p.images && p.images[0] ? p.images[0] : 'assets/logo.jpg';
      
      // Badges
      let badgeHtml = '';
      if (p.featured) {
        badgeHtml += `<span class="badge-pill badge-popular"><i class="fa-solid fa-fire"></i> Featured</span>`;
      }
      if (p.stockStatus === 'in_stock') {
        badgeHtml += `<span class="badge-pill badge-stock-in">In Stock</span>`;
      } else if (p.stockStatus === 'made_to_order') {
        badgeHtml += `<span class="badge-pill badge-stock-order">Made to Order</span>`;
      } else if (p.stockStatus === 'out_of_stock') {
        badgeHtml += `<span class="badge-pill badge-stock-out">Sold Out</span>`;
      }

      // Tags
      const tagsHtml = (p.tags || []).slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('');

      // Discount
      const origPriceHtml = p.originalPrice && p.originalPrice > p.price
        ? `<span class="card-orig-price">${StorageManager.formatPrice(p.originalPrice)}</span>`
        : '';

      gridHtml += `
        <article class="product-card" data-id="${p.id}">
          <div class="card-image-wrap" onclick="window.EiTohApp.openQuickView('${p.id}')">
            <div class="card-badge-container">
              ${badgeHtml}
            </div>
            <div class="card-quick-actions" onclick="event.stopPropagation()">
              <button type="button" class="btn-card-action" onclick="window.EiTohApp.openQuickView('${p.id}')" title="Quick View">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
            <img src="${img}" alt="${p.title}" loading="lazy">
          </div>

          <div class="card-body">
            <div class="card-category-row">
              <span class="card-cat-name">${catName}</span>
              <div class="card-rating">
                <i class="fa-solid fa-star"></i>
                ${p.rating || '5.0'}
                <span>(${p.reviewsCount || 1})</span>
              </div>
            </div>

            <h3 class="card-title" onclick="window.EiTohApp.openQuickView('${p.id}')">${p.title}</h3>
            ${p.banglaTitle ? `<div class="card-bangla-title">${p.banglaTitle}</div>` : ''}
            <p class="card-desc">${p.shortDescription || p.description || ''}</p>

            <div class="card-tags">
              ${tagsHtml}
            </div>

            <div class="card-footer">
              <div class="card-pricing">
                <span class="card-current-price">${StorageManager.formatPrice(p.price)}</span>
                ${origPriceHtml}
              </div>
              <button type="button" class="btn-add-cart" onclick="window.EiTohApp.quickAddToCart('${p.id}', event)">
                <i class="fa-solid fa-cart-plus"></i> Add
              </button>
            </div>
          </div>
        </article>
      `;
    });

    elements.productGrid.innerHTML = gridHtml;
  }

  // =========================================================================
  // QUICK VIEW MODAL
  // =========================================================================
  function openQuickView(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    state.modalProduct = product;
    state.modalQty = 1;
    state.modalSelectedColor = (product.colors && product.colors.length > 0) ? product.colors[0] : null;

    const categories = StorageManager.getCategories();
    const catObj = categories.find(c => c.id === product.category);

    elements.modalImg.src = product.images && product.images[0] ? product.images[0] : 'assets/logo.jpg';
    elements.modalCategory.textContent = catObj ? catObj.name : product.category;
    elements.modalTitle.textContent = product.title;
    elements.modalBanglaTitle.textContent = product.banglaTitle || '';
    elements.modalCurrentPrice.textContent = StorageManager.formatPrice(product.price);
    
    if (product.originalPrice && product.originalPrice > product.price) {
      elements.modalOrigPrice.textContent = StorageManager.formatPrice(product.originalPrice);
      elements.modalOrigPrice.style.display = 'inline';
    } else {
      elements.modalOrigPrice.style.display = 'none';
    }

    elements.modalDesc.textContent = product.description || product.shortDescription || '';
    elements.modalQtyDisplay.textContent = '1';

    // Render Specs Table
    let specsHtml = '';
    if (product.specs) {
      Object.entries(product.specs).forEach(([key, val]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        specsHtml += `
          <tr>
            <td>${formattedKey}</td>
            <td>${val}</td>
          </tr>
        `;
      });
    }
    elements.modalSpecsTable.innerHTML = specsHtml;

    // Render Color / Finish Selector
    if (product.colors && product.colors.length > 0) {
      let colorHtml = '';
      product.colors.forEach((color, idx) => {
        const isSelected = idx === 0 ? 'selected' : '';
        colorHtml += `
          <button type="button" class="color-pill-btn ${isSelected}" data-color="${color}">
            ${color}
          </button>
        `;
      });
      elements.modalColorPills.innerHTML = colorHtml;
      document.getElementById('modalVariantContainer').style.display = 'block';

      // Bind color pill click
      elements.modalColorPills.querySelectorAll('.color-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          elements.modalColorPills.querySelectorAll('.color-pill-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state.modalSelectedColor = btn.dataset.color;
        });
      });
    } else {
      document.getElementById('modalVariantContainer').style.display = 'none';
    }

    elements.quickViewModal.classList.add('open');
    elements.quickViewModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    elements.quickViewModal.classList.remove('open');
    elements.quickViewModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // =========================================================================
  // CART & DRAWER MANAGEMENT
  // =========================================================================
  function quickAddToCart(productId, event) {
    if (event) event.stopPropagation();
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    StorageManager.addToCart(productId, 1, {
      color: product.colors && product.colors[0] ? product.colors[0] : 'Standard'
    });

    showToast(`Added "${product.title}" to cart!`);

    // Button animation feedback
    if (event && event.currentTarget) {
      const btn = event.currentTarget;
      const origText = btn.innerHTML;
      btn.innerHTML = `<i class="fa-solid fa-check"></i> Added!`;
      btn.classList.add('added');
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.classList.remove('added');
      }, 1400);
    }
  }

  function openCart() {
    elements.cartOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    updateCartUI();
  }

  function closeCart() {
    elements.cartOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function updateCartUI() {
    const cart = StorageManager.getCart();
    const settings = StorageManager.getSettings();

    // Total count of items
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Update Header and Drawer Badges
    if (elements.headerCartCount) {
      elements.headerCartCount.textContent = totalCount;
      elements.headerCartCount.classList.add('pop');
      setTimeout(() => elements.headerCartCount.classList.remove('pop'), 300);
    }
    if (elements.drawerCartCount) {
      elements.drawerCartCount.textContent = totalCount;
    }

    if (!elements.cartDrawerBody) return;

    if (cart.length === 0) {
      elements.cartDrawerBody.innerHTML = `
        <div class="catalog-empty-state" style="margin: 40px auto; padding: 30px;">
          <i class="fa-solid fa-bag-shopping" style="font-size: 2.5rem; color: var(--text-light);"></i>
          <h4 style="margin: 10px 0 6px;">Your cart is empty</h4>
          <p style="font-size: 0.85rem;">Discover our custom 3D printed models and add them to your cart!</p>
        </div>
      `;
      if (elements.cartDrawerFooter) {
        elements.cartDrawerFooter.style.opacity = '0.5';
        elements.cartDrawerFooter.style.pointerEvents = 'none';
      }
      return;
    }

    if (elements.cartDrawerFooter) {
      elements.cartDrawerFooter.style.opacity = '1';
      elements.cartDrawerFooter.style.pointerEvents = 'auto';
    }

    // Render Items
    let itemsHtml = '';
    let subtotal = 0;

    cart.forEach(item => {
      const itemSubtotal = (item.price || 0) * item.quantity;
      subtotal += itemSubtotal;

      itemsHtml += `
        <div class="cart-item-row" data-cart-id="${item.cartItemId}">
          <img src="${item.image}" alt="${item.title}" class="cart-item-img">
          
          <div class="cart-item-details">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-variant"><i class="fa-solid fa-palette"></i> ${item.selectedColor || 'Standard'}</div>
            <div class="cart-item-price">${StorageManager.formatPrice(item.price)} × ${item.quantity} = ${StorageManager.formatPrice(itemSubtotal)}</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <button type="button" class="btn-remove-item" onclick="window.EiTohApp.removeItemFromCart('${item.cartItemId}')" title="Remove Item">
              <i class="fa-solid fa-trash-can"></i>
            </button>
            <div class="cart-qty-control">
              <button type="button" class="btn-qty" onclick="window.EiTohApp.changeCartQty('${item.cartItemId}', ${item.quantity - 1})"><i class="fa-solid fa-minus"></i></button>
              <span class="qty-display">${item.quantity}</span>
              <button type="button" class="btn-qty" onclick="window.EiTohApp.changeCartQty('${item.cartItemId}', ${item.quantity + 1})"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
        </div>
      `;
    });

    // Append Customer Details Form
    const deliveryRate = state.selectedDeliveryArea === 'inside'
      ? (settings.insideDelivery || 70)
      : state.selectedDeliveryArea === 'outside'
        ? (settings.outsideDelivery || 130)
        : 0;

    const isFreeDelivery = settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold;
    const finalDelivery = isFreeDelivery ? 0 : deliveryRate;
    const grandTotal = subtotal + finalDelivery;

    itemsHtml += `
      <div class="cart-customer-section">
        <h5><i class="fa-solid fa-truck-ramp-box"></i> Delivery & Customer Details</h5>
        
        <div class="cart-form-group">
          <label>Your Full Name *</label>
          <input type="text" id="custName" class="cart-form-input" placeholder="e.g. Tanvir Rahman" required>
        </div>

        <div class="cart-form-group">
          <label>WhatsApp / Phone Number *</label>
          <input type="tel" id="custPhone" class="cart-form-input" placeholder="e.g. 017XXXXXXXX" required>
        </div>

        <div class="cart-form-group">
          <label>Delivery Location *</label>
          <select id="custDeliveryArea" class="cart-form-select">
            <option value="inside" ${state.selectedDeliveryArea === 'inside' ? 'selected' : ''}>Inside Dhaka (${StorageManager.formatPrice(settings.insideDelivery || 70)})</option>
            <option value="outside" ${state.selectedDeliveryArea === 'outside' ? 'selected' : ''}>Outside Dhaka (${StorageManager.formatPrice(settings.outsideDelivery || 130)})</option>
            <option value="pickup" ${state.selectedDeliveryArea === 'pickup' ? 'selected' : ''}>Store Pickup (Free - Mirpur DOHS)</option>
          </select>
        </div>

        <div class="cart-form-group">
          <label>Full Delivery Address *</label>
          <textarea id="custAddress" class="cart-form-input" rows="2" placeholder="House, Road, Area, City..."></textarea>
        </div>

        <div class="cart-form-group">
          <label>Special Instructions / Custom Notes (Optional)</label>
          <input type="text" id="custNotes" class="cart-form-input" placeholder="e.g., specific color code or gift wrapping">
        </div>
      </div>
    `;

    elements.cartDrawerBody.innerHTML = itemsHtml;

    // Bind delivery select change
    const custDeliveryArea = document.getElementById('custDeliveryArea');
    if (custDeliveryArea) {
      custDeliveryArea.addEventListener('change', (e) => {
        state.selectedDeliveryArea = e.target.value;
        updateCartUI();
      });
    }

    // Update Totals
    if (elements.cartSubtotal) elements.cartSubtotal.textContent = StorageManager.formatPrice(subtotal);
    if (elements.cartDeliveryCharge) {
      elements.cartDeliveryCharge.textContent = isFreeDelivery 
        ? 'FREE (Subtotal > ৳2,500)' 
        : StorageManager.formatPrice(finalDelivery);
    }
    if (elements.cartGrandTotal) elements.cartGrandTotal.textContent = StorageManager.formatPrice(grandTotal);
  }

  // =========================================================================
  // WHATSAPP CHECKOUT ORDER GENERATOR
  // =========================================================================
  function executeWhatsappCheckout() {
    const cart = StorageManager.getCart();
    if (cart.length === 0) {
      showToast('Your cart is empty!');
      return;
    }

    const custName = document.getElementById('custName')?.value.trim();
    const custPhone = document.getElementById('custPhone')?.value.trim();
    const custAddress = document.getElementById('custAddress')?.value.trim();
    const custNotes = document.getElementById('custNotes')?.value.trim();

    if (!custName) {
      alert('Please enter your Name before checkout.');
      document.getElementById('custName')?.focus();
      return;
    }
    if (!custPhone) {
      alert('Please enter your WhatsApp or Phone number.');
      document.getElementById('custPhone')?.focus();
      return;
    }
    if (!custAddress && state.selectedDeliveryArea !== 'pickup') {
      alert('Please enter your Delivery Address.');
      document.getElementById('custAddress')?.focus();
      return;
    }

    const settings = StorageManager.getSettings();
    const deliveryName = state.selectedDeliveryArea === 'inside'
      ? `Inside Dhaka (${StorageManager.formatPrice(settings.insideDelivery || 70)})`
      : state.selectedDeliveryArea === 'outside'
        ? `Outside Dhaka (${StorageManager.formatPrice(settings.outsideDelivery || 130)})`
        : `Store Pickup (Free)`;

    const deliveryRate = state.selectedDeliveryArea === 'inside'
      ? (settings.insideDelivery || 70)
      : state.selectedDeliveryArea === 'outside'
        ? (settings.outsideDelivery || 130)
        : 0;

    let subtotal = 0;
    let itemsText = '';

    cart.forEach((item, index) => {
      const itemSub = (item.price || 0) * item.quantity;
      subtotal += itemSub;
      itemsText += `${index + 1}. *${item.title}*\n   • Option/Color: _${item.selectedColor || 'Standard'}_\n   • Qty: ${item.quantity} × ${StorageManager.formatPrice(item.price)} = *${StorageManager.formatPrice(itemSub)}*\n\n`;
    });

    const isFree = settings.freeDeliveryThreshold && subtotal >= settings.freeDeliveryThreshold;
    const finalDelivery = isFree ? 0 : deliveryRate;
    const grandTotal = subtotal + finalDelivery;

    // Build the formatted WhatsApp message
    let msg = `🛒 *NEW ORDER - EiToh (এইতো)*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *Customer Details:*\n`;
    msg += `• *Name:* ${custName}\n`;
    msg += `• *Phone:* ${custPhone}\n`;
    msg += `• *Delivery Option:* ${deliveryName}\n`;
    if (state.selectedDeliveryArea !== 'pickup') {
      msg += `• *Address:* ${custAddress}\n`;
    }
    if (custNotes) {
      msg += `• *Note:* ${custNotes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📦 *Ordered Items:*\n`;
    msg += itemsText;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 *Subtotal:* ${StorageManager.formatPrice(subtotal)}\n`;
    msg += `🚚 *Delivery:* ${isFree ? 'FREE' : StorageManager.formatPrice(finalDelivery)}\n`;
    msg += `💰 *TOTAL PAYABLE:* *${StorageManager.formatPrice(grandTotal)}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `✨ _Order placed via EiToh Online Catalog. Please confirm availability & dispatch time._`;

    const cleanWaNum = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanWaNum}?text=${encodeURIComponent(msg)}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');

    showToast('Redirecting to WhatsApp with your order! 🚀');
  }

  // =========================================================================
  // TOAST NOTIFICATIONS
  // =========================================================================
  function showToast(message) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // =========================================================================
  // EVENT BINDINGS
  // =========================================================================
  function bindEvents() {
    // Live Search
    if (elements.searchInput) {
      elements.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value;
        if (elements.searchClearBtn) {
          elements.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
        renderProducts();
      });
    }

    if (elements.searchClearBtn) {
      elements.searchClearBtn.addEventListener('click', () => {
        if (elements.searchInput) elements.searchInput.value = '';
        state.searchQuery = '';
        elements.searchClearBtn.style.display = 'none';
        renderProducts();
      });
    }

    // Filter Popover Toggle
    if (elements.btnFilterTrigger) {
      elements.btnFilterTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = elements.filterPopoverPanel.classList.contains('open');
        if (isOpen) {
          elements.filterPopoverPanel.classList.remove('open');
          elements.btnFilterTrigger.setAttribute('aria-expanded', 'false');
        } else {
          elements.filterPopoverPanel.classList.add('open');
          elements.btnFilterTrigger.setAttribute('aria-expanded', 'true');
        }
      });
    }

    // Close Popover when clicking outside
    document.addEventListener('click', (e) => {
      if (elements.filterPopoverPanel && elements.filterPopoverPanel.classList.contains('open')) {
        if (!elements.filterPopoverPanel.contains(e.target) && !elements.btnFilterTrigger.contains(e.target)) {
          elements.filterPopoverPanel.classList.remove('open');
          elements.btnFilterTrigger.setAttribute('aria-expanded', 'false');
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

    // Reset / Clear Filters Button in Popover
    if (elements.btnClearFilters) {
      elements.btnClearFilters.addEventListener('click', () => {
        state.selectedCategory = 'all';
        state.selectedTag = 'all';
        renderCategories();
        renderActiveFilterChips();
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

    // Cart Drawer Triggers
    if (elements.cartTriggerBtn) elements.cartTriggerBtn.addEventListener('click', openCart);
    if (elements.btnCloseCart) elements.btnCloseCart.addEventListener('click', closeCart);
    if (elements.cartOverlay) {
      elements.cartOverlay.addEventListener('click', (e) => {
        if (e.target === elements.cartOverlay) closeCart();
      });
    }

    // WhatsApp Checkout Click
    if (elements.btnWhatsappCheckout) {
      elements.btnWhatsappCheckout.addEventListener('click', executeWhatsappCheckout);
    }

    // Hero Quote Click
    if (elements.btnHeroCustomQuote) {
      elements.btnHeroCustomQuote.addEventListener('click', () => {
        const settings = StorageManager.getSettings();
        const cleanWa = (settings.whatsappNumber || '').replace(/[^0-9]/g, '');
        const quoteMsg = "Hello EiToh! I would like to get a quote for a custom 3D printed model / lithophane lamp.";
        window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(quoteMsg)}`, '_blank');
      });
    }

    // Modal Events
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeQuickView);
    if (elements.quickViewModal) {
      elements.quickViewModal.addEventListener('click', (e) => {
        if (e.target === elements.quickViewModal) closeQuickView();
      });
    }

    if (elements.btnModalInc) {
      elements.btnModalInc.addEventListener('click', () => {
        state.modalQty += 1;
        elements.modalQtyDisplay.textContent = state.modalQty;
      });
    }

    if (elements.btnModalDec) {
      elements.btnModalDec.addEventListener('click', () => {
        if (state.modalQty > 1) {
          state.modalQty -= 1;
          elements.modalQtyDisplay.textContent = state.modalQty;
        }
      });
    }

    if (elements.btnModalAddToCart) {
      elements.btnModalAddToCart.addEventListener('click', () => {
        if (!state.modalProduct) return;
        StorageManager.addToCart(state.modalProduct.id, state.modalQty, {
          color: state.modalSelectedColor || 'Standard'
        });
        showToast(`Added ${state.modalQty} × "${state.modalProduct.title}" to cart!`);
        closeQuickView();
      });
    }

    // Footer Category Links
    document.querySelectorAll('.footer-cat-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = link.dataset.cat;
        state.selectedCategory = cat;
        renderCategories();
        renderProducts();
        document.getElementById('catalogSection')?.scrollIntoView({ behavior: 'smooth' });
      });
    });

    // Listen to Storage update events from CMS or other tabs
    window.addEventListener('eitoh_data_updated', () => {
      loadSettings();
      renderCategories();
      renderProducts();
    });

    window.addEventListener('eitoh_cart_updated', () => {
      updateCartUI();
    });
  }

  // Expose methods for inline event handlers
  window.EiTohApp = {
    openQuickView,
    closeQuickView,
    quickAddToCart,
    changeCartQty: (cartItemId, newQty) => {
      StorageManager.updateCartItemQuantity(cartItemId, newQty);
    },
    removeItemFromCart: (cartItemId) => {
      StorageManager.removeFromCart(cartItemId);
      showToast('Item removed from cart');
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
    openCart,
    closeCart
  };

  // Run
  init();
});
