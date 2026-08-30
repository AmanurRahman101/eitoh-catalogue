/**
 * EiToh (এইতো) - CMS Admin Dashboard Controller
 * Powers product management, drag-and-drop image uploads, category configuration,
 * WhatsApp settings, and JSON backup/sync.
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    currentTab: 'tabProducts',
    searchFilter: '',
    categoryFilter: 'all',
    uploadedImages: [],
    editingProductId: null
  };

  // Elements
  const elements = {
    // PIN Overlay
    pinOverlay: document.getElementById('pinOverlay'),
    pinInput: document.getElementById('pinInput'),
    
    // Stats
    statTotalProducts: document.getElementById('statTotalProducts'),
    statInStock: document.getElementById('statInStock'),
    statCategories: document.getElementById('statCategories'),
    statWhatsApp: document.getElementById('statWhatsApp'),

    // Nav
    navItems: document.querySelectorAll('.admin-nav-item'),
    tabPanels: document.querySelectorAll('.admin-tab-panel'),

    // Products Tab
    adminSearchInput: document.getElementById('adminSearchInput'),
    adminCategoryFilter: document.getElementById('adminCategoryFilter'),
    adminProductsTableBody: document.getElementById('adminProductsTableBody'),
    btnOpenAddProduct: document.getElementById('btnOpenAddProduct'),

    // Product Modal
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

    // Form inputs
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

    // Sync Tab
    btnCopyJson: document.getElementById('btnCopyJson'),
    btnDownloadJson: document.getElementById('btnDownloadJson'),
    importJsonFileInput: document.getElementById('importJsonFileInput'),
    btnResetDefaults: document.getElementById('btnResetDefaults'),
    jsonPreviewBox: document.getElementById('jsonPreviewBox'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // AUTHENTICATION & PIN CHECK
  // =========================================================================
  function checkAuth() {
    const isAuth = sessionStorage.getItem('eitoh_admin_authenticated');
    if (isAuth === 'true') {
      elements.pinOverlay.style.display = 'none';
      initDashboard();
    } else {
      elements.pinOverlay.style.display = 'flex';
      if (elements.pinInput) elements.pinInput.focus();
    }
  }

  function submitPin() {
    const settings = StorageManager.getSettings();
    const correctPin = settings.adminPin || '1234';
    const enteredPin = elements.pinInput.value.trim();

    if (enteredPin === correctPin) {
      sessionStorage.setItem('eitoh_admin_authenticated', 'true');
      elements.pinOverlay.style.display = 'none';
      showToast('Welcome to EiToh CMS!');
      initDashboard();
    } else {
      alert('Incorrect PIN. Default PIN is 1234.');
      elements.pinInput.value = '';
      elements.pinInput.focus();
    }
  }

  function lockSession() {
    sessionStorage.removeItem('eitoh_admin_authenticated');
    location.reload();
  }

  // =========================================================================
  // DASHBOARD INITIALIZATION
  // =========================================================================
  function initDashboard() {
    updateStats();
    populateCategoryDropdowns();
    renderProductsTable();
    renderCategoriesTable();
    loadSettingsForm();
    updateJsonPreview();
    bindAdminEvents();
  }

  function updateStats() {
    const products = StorageManager.getProducts();
    const categories = StorageManager.getCategories();
    const settings = StorageManager.getSettings();

    const inStockCount = products.filter(p => p.stockStatus === 'in_stock').length;

    if (elements.statTotalProducts) elements.statTotalProducts.textContent = products.length;
    if (elements.statInStock) elements.statInStock.textContent = inStockCount;
    if (elements.statCategories) elements.statCategories.textContent = categories.length;
    if (elements.statWhatsApp) {
      elements.statWhatsApp.textContent = settings.whatsappNumber ? `+${settings.whatsappNumber}` : 'Not set';
    }
  }

  // =========================================================================
  // PRODUCTS MANAGEMENT
  // =========================================================================
  function populateCategoryDropdowns() {
    const categories = StorageManager.getCategories();

    // Table Filter Dropdown
    if (elements.adminCategoryFilter) {
      let filterOpts = `<option value="all">All Categories (${StorageManager.getProducts().length})</option>`;
      categories.forEach(c => {
        if (c.id !== 'all') {
          filterOpts += `<option value="${c.id}">${c.name}</option>`;
        }
      });
      elements.adminCategoryFilter.innerHTML = filterOpts;
    }

    // Modal Form Category Dropdown
    if (elements.prodCategory) {
      let formOpts = '';
      categories.forEach(c => {
        if (c.id !== 'all') {
          formOpts += `<option value="${c.id}">${c.name}</option>`;
        }
      });
      elements.prodCategory.innerHTML = formOpts;
    }
  }

  function renderProductsTable() {
    let products = StorageManager.getProducts();
    const categories = StorageManager.getCategories();

    // Apply Search
    if (state.searchFilter.trim()) {
      const q = state.searchFilter.toLowerCase().trim();
      products = products.filter(p =>
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.banglaTitle && p.banglaTitle.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // Apply Category Filter
    if (state.categoryFilter !== 'all') {
      products = products.filter(p => p.category === state.categoryFilter);
    }

    if (!elements.adminProductsTableBody) return;

    if (products.length === 0) {
      elements.adminProductsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-box-open" style="font-size: 2rem; margin-bottom: 8px; display: block;"></i>
            No products found matching your filters.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    products.forEach(p => {
      const cat = categories.find(c => c.id === p.category);
      const catName = cat ? cat.name : p.category;
      const img = p.images && p.images[0] ? p.images[0] : 'assets/logo.jpg';

      let statusBadge = '';
      if (p.stockStatus === 'in_stock') {
        statusBadge = `<span class="badge-pill badge-stock-in">In Stock</span>`;
      } else if (p.stockStatus === 'made_to_order') {
        statusBadge = `<span class="badge-pill badge-stock-order">Made to Order</span>`;
      } else {
        statusBadge = `<span class="badge-pill badge-stock-out">Out of Stock</span>`;
      }

      rowsHtml += `
        <tr>
          <td>
            <img src="${img}" alt="${p.title}" class="table-product-thumb">
          </td>
          <td>
            <div class="table-product-cell">
              <div>
                <div class="table-product-title">${p.title}</div>
                ${p.banglaTitle ? `<div class="table-product-sub bangla-text">${p.banglaTitle}</div>` : ''}
              </div>
            </div>
          </td>
          <td><span style="font-weight: 600; color: var(--brand-primary);">${catName}</span></td>
          <td><strong>${StorageManager.formatPrice(p.price)}</strong></td>
          <td>${statusBadge}</td>
          <td>
            ${p.featured 
              ? `<i class="fa-solid fa-star" style="color: #f59e0b;" title="Featured"></i>` 
              : `<span style="color: var(--text-light);">-</span>`}
          </td>
          <td>
            <div class="table-actions-cell" style="justify-content: flex-end;">
              <button type="button" class="btn-table-action" onclick="window.EiTohAdmin.editProduct('${p.id}')" title="Edit Product">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-table-action" onclick="window.EiTohAdmin.duplicateProduct('${p.id}')" title="Duplicate Product">
                <i class="fa-solid fa-copy"></i>
              </button>
              <button type="button" class="btn-table-action delete" onclick="window.EiTohAdmin.deleteProduct('${p.id}')" title="Delete Product">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    elements.adminProductsTableBody.innerHTML = rowsHtml;
  }

  // =========================================================================
  // PRODUCT FORM & IMAGE UPLOADER
  // =========================================================================
  function openAddProductModal() {
    state.editingProductId = null;
    state.uploadedImages = [];
    elements.productForm.reset();
    elements.editProductId.value = '';
    elements.productModalHeading.textContent = 'Add New 3D Creation';
    renderImagePreviews();
    elements.productModal.classList.add('open');
    elements.productModal.setAttribute('aria-hidden', 'false');
  }

  function editProduct(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    state.editingProductId = productId;
    state.uploadedImages = product.images ? [...product.images] : [];

    elements.editProductId.value = product.id;
    elements.prodTitle.value = product.title || '';
    elements.prodBanglaTitle.value = product.banglaTitle || '';
    elements.prodCategory.value = product.category || 'articulated';
    elements.prodStockStatus.value = product.stockStatus || 'in_stock';
    elements.prodPrice.value = product.price || '';
    elements.prodOriginalPrice.value = product.originalPrice || '';
    elements.prodShortDesc.value = product.shortDescription || '';
    elements.prodDesc.value = product.description || '';
    elements.prodTags.value = product.tags ? product.tags.join(', ') : '';
    elements.prodColors.value = product.colors ? product.colors.join(', ') : '';

    if (product.specs) {
      elements.prodSpecMaterial.value = product.specs.material || '';
      elements.prodSpecDimensions.value = product.specs.dimensions || product.specs.length || '';
      elements.prodSpecPrintTime.value = product.specs.printTime || '';
      elements.prodSpecInfill.value = product.specs.infill || product.specs.finish || '';
    } else {
      elements.prodSpecMaterial.value = '';
      elements.prodSpecDimensions.value = '';
      elements.prodSpecPrintTime.value = '';
      elements.prodSpecInfill.value = '';
    }

    elements.prodFeatured.checked = !!product.featured;

    elements.productModalHeading.textContent = `Edit Product: ${product.title}`;
    renderImagePreviews();
    elements.productModal.classList.add('open');
  }

  function closeProductModal() {
    elements.productModal.classList.remove('open');
    elements.productModal.setAttribute('aria-hidden', 'true');
  }

  function renderImagePreviews() {
    if (!elements.productImagePreviewStrip) return;

    if (state.uploadedImages.length === 0) {
      elements.productImagePreviewStrip.innerHTML = `
        <span style="font-size: 0.78rem; color: var(--text-muted);">No images added yet. Default logo will be used if left blank.</span>
      `;
      return;
    }

    let html = '';
    state.uploadedImages.forEach((imgSrc, idx) => {
      html += `
        <div class="preview-thumb-wrap">
          <img src="${imgSrc}" alt="Preview ${idx}">
          <div class="preview-thumb-remove" onclick="window.EiTohAdmin.removeImage(${idx})" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </div>
        </div>
      `;
    });
    elements.productImagePreviewStrip.innerHTML = html;
  }

  function handleImageFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        state.uploadedImages.push(e.target.result);
        renderImagePreviews();
      };
      reader.readAsDataURL(file);
    });
  }

  function handleSaveProduct(e) {
    e.preventDefault();

    const title = elements.prodTitle.value.trim();
    const price = parseFloat(elements.prodPrice.value);

    if (!title || isNaN(price)) {
      alert('Please provide a valid product title and selling price.');
      return;
    }

    // Process Tags
    const rawTags = elements.prodTags.value.split(',').map(t => t.trim()).filter(Boolean);
    // Process Colors
    const rawColors = elements.prodColors.value.split(',').map(c => c.trim()).filter(Boolean);

    // Process Specs
    const specs = {};
    if (elements.prodSpecMaterial.value.trim()) specs.material = elements.prodSpecMaterial.value.trim();
    if (elements.prodSpecDimensions.value.trim()) specs.dimensions = elements.prodSpecDimensions.value.trim();
    if (elements.prodSpecPrintTime.value.trim()) specs.printTime = elements.prodSpecPrintTime.value.trim();
    if (elements.prodSpecInfill.value.trim()) specs.infill = elements.prodSpecInfill.value.trim();

    const productPayload = {
      title: title,
      banglaTitle: elements.prodBanglaTitle.value.trim(),
      category: elements.prodCategory.value,
      price: price,
      originalPrice: elements.prodOriginalPrice.value ? parseFloat(elements.prodOriginalPrice.value) : null,
      images: state.uploadedImages.length > 0 ? state.uploadedImages : ['assets/logo.jpg'],
      shortDescription: elements.prodShortDesc.value.trim(),
      description: elements.prodDesc.value.trim(),
      tags: rawTags.length > 0 ? rawTags : ['3D Print'],
      colors: rawColors.length > 0 ? rawColors : ['Standard'],
      stockStatus: elements.prodStockStatus.value,
      featured: elements.prodFeatured.checked,
      specs: Object.keys(specs).length > 0 ? specs : { material: 'PLA+' },
      rating: 5.0,
      reviewsCount: 1
    };

    if (state.editingProductId) {
      StorageManager.updateProduct(state.editingProductId, productPayload);
      showToast(`Updated "${title}" successfully!`);
    } else {
      StorageManager.addProduct(productPayload);
      showToast(`Added "${title}" to catalog!`);
    }

    closeProductModal();
    updateStats();
    renderProductsTable();
    updateJsonPreview();
  }

  function deleteProduct(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    if (confirm(`Are you sure you want to delete "${product.title}"?`)) {
      StorageManager.deleteProduct(productId);
      showToast(`Deleted "${product.title}"`);
      updateStats();
      renderProductsTable();
      updateJsonPreview();
    }
  }

  function duplicateProduct(productId) {
    const product = StorageManager.getProductById(productId);
    if (!product) return;

    const copy = JSON.parse(JSON.stringify(product));
    delete copy.id;
    copy.title = `${copy.title} (Copy)`;
    StorageManager.addProduct(copy);
    showToast(`Duplicated "${copy.title}"`);
    updateStats();
    renderProductsTable();
    updateJsonPreview();
  }

  // =========================================================================
  // CATEGORIES MANAGEMENT
  // =========================================================================
  function renderCategoriesTable() {
    const categories = StorageManager.getCategories();
    const products = StorageManager.getProducts();

    if (!elements.adminCategoriesTableBody) return;

    let html = '';
    categories.forEach(c => {
      const count = c.id === 'all' 
        ? products.length 
        : products.filter(p => p.category === c.id).length;

      html += `
        <tr>
          <td><i class="fa-solid ${c.icon || 'fa-cube'}" style="font-size: 1.2rem; color: var(--brand-primary);"></i></td>
          <td><strong>${c.name}</strong></td>
          <td><code>${c.id}</code></td>
          <td><span class="badge-pill badge-popular" style="font-size: 0.7rem;">${c.badge || 'Active'}</span></td>
          <td><span class="cat-pill-badge" style="font-size: 0.85rem; font-weight: 700;">${count} products</span></td>
          <td>
            <div class="table-actions-cell" style="justify-content: flex-end;">
              ${c.id !== 'all' ? `
                <button type="button" class="btn-table-action delete" onclick="window.EiTohAdmin.deleteCategory('${c.id}')" title="Delete Category">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              ` : '<span style="font-size: 0.75rem; color: var(--text-light);">Default</span>'}
            </div>
          </td>
        </tr>
      `;
    });

    elements.adminCategoriesTableBody.innerHTML = html;
  }

  function addCategoryPrompt() {
    const name = prompt('Enter Category Name (e.g. Mechanical Toys):');
    if (!name || !name.trim()) return;

    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const categories = StorageManager.getCategories();

    if (categories.some(c => c.id === slug)) {
      alert('A category with this identifier already exists.');
      return;
    }

    categories.push({
      id: slug,
      name: name.trim(),
      icon: 'fa-cube',
      badge: 'New'
    });

    StorageManager.saveCategories(categories);
    showToast(`Added category "${name}"`);
    populateCategoryDropdowns();
    renderCategoriesTable();
    updateStats();
    updateJsonPreview();
  }

  function deleteCategory(categoryId) {
    let categories = StorageManager.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    if (confirm(`Delete category "${cat.name}"? Products in this category will remain.`)) {
      categories = categories.filter(c => c.id !== categoryId);
      StorageManager.saveCategories(categories);
      showToast(`Deleted category "${cat.name}"`);
      populateCategoryDropdowns();
      renderCategoriesTable();
      updateStats();
      updateJsonPreview();
    }
  }

  // =========================================================================
  // SETTINGS MANAGEMENT
  // =========================================================================
  function loadSettingsForm() {
    const settings = StorageManager.getSettings();

    if (elements.settingWhatsappNumber) elements.settingWhatsappNumber.value = settings.whatsappNumber || '';
    if (elements.settingCurrency) elements.settingCurrency.value = settings.currency || '৳';
    if (elements.settingInsideDelivery) elements.settingInsideDelivery.value = settings.insideDelivery || 70;
    if (elements.settingOutsideDelivery) elements.settingOutsideDelivery.value = settings.outsideDelivery || 130;
    if (elements.settingFreeDeliveryThreshold) elements.settingFreeDeliveryThreshold.value = settings.freeDeliveryThreshold || 2500;
    if (elements.settingStoreName) elements.settingStoreName.value = settings.storeName || '';
    if (elements.settingTagline) elements.settingTagline.value = settings.tagline || '';
    if (elements.settingAnnouncement) elements.settingAnnouncement.value = settings.announcement || '';
    if (elements.settingAdminPin) elements.settingAdminPin.value = settings.adminPin || '1234';
  }

  function saveSettings() {
    const newSettings = {
      whatsappNumber: elements.settingWhatsappNumber.value.trim().replace(/[^0-9]/g, ''),
      currency: elements.settingCurrency.value.trim() || '৳',
      insideDelivery: parseFloat(elements.settingInsideDelivery.value) || 0,
      outsideDelivery: parseFloat(elements.settingOutsideDelivery.value) || 0,
      freeDeliveryThreshold: parseFloat(elements.settingFreeDeliveryThreshold.value) || 0,
      storeName: elements.settingStoreName.value.trim(),
      tagline: elements.settingTagline.value.trim(),
      announcement: elements.settingAnnouncement.value.trim(),
      adminPin: elements.settingAdminPin.value.trim() || '1234'
    };

    StorageManager.saveSettings(newSettings);
    showToast('Settings saved successfully! ⚙️');
    updateStats();
    updateJsonPreview();
  }

  // =========================================================================
  // EXPORT, BACKUP & AI SYNC
  // =========================================================================
  function updateJsonPreview() {
    if (elements.jsonPreviewBox) {
      elements.jsonPreviewBox.textContent = StorageManager.exportJSON();
    }
  }

  function copyJsonToClipboard() {
    const jsonStr = StorageManager.exportJSON();
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast('JSON copied to clipboard! Ready to paste to AI Agent.');
    }).catch(err => {
      alert('Could not copy to clipboard: ' + err);
    });
  }

  function downloadJsonFile() {
    const jsonStr = StorageManager.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eitoh_catalogue_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Backup file downloaded.');
  }

  function handleImportJsonFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = StorageManager.importJSON(event.target.result);
      if (res.success) {
        showToast(res.message);
        initDashboard();
      } else {
        alert('Failed to import JSON: ' + res.message);
      }
    };
    reader.readAsText(file);
  }

  function resetFactoryDefaults() {
    if (confirm('Reset entire catalog to original demo products and settings? Any new items will be cleared.')) {
      StorageManager.resetToDefaults();
      showToast('Reset catalog to factory defaults.');
      initDashboard();
    }
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
  function bindAdminEvents() {
    // Nav Tabs
    elements.navItems.forEach(item => {
      item.addEventListener('click', () => {
        const targetTab = item.dataset.tab;
        elements.navItems.forEach(i => i.classList.remove('active'));
        elements.tabPanels.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        document.getElementById(targetTab)?.classList.add('active');
        state.currentTab = targetTab;
        if (targetTab === 'tabSync') updateJsonPreview();
      });
    });

    // Product search & category filter in table
    if (elements.adminSearchInput) {
      elements.adminSearchInput.addEventListener('input', (e) => {
        state.searchFilter = e.target.value;
        renderProductsTable();
      });
    }

    if (elements.adminCategoryFilter) {
      elements.adminCategoryFilter.addEventListener('change', (e) => {
        state.categoryFilter = e.target.value;
        renderProductsTable();
      });
    }

    // Product Modal Triggers
    if (elements.btnOpenAddProduct) elements.btnOpenAddProduct.addEventListener('click', openAddProductModal);
    if (elements.btnCloseProductModal) elements.btnCloseProductModal.addEventListener('click', closeProductModal);
    if (elements.btnCancelProductModal) elements.btnCancelProductModal.addEventListener('click', closeProductModal);
    if (elements.productForm) elements.productForm.addEventListener('submit', handleSaveProduct);

    // Image Uploader Dropzone
    if (elements.imageDropzone) {
      elements.imageDropzone.addEventListener('click', () => {
        elements.productImageFileInput?.click();
      });

      elements.imageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imageDropzone.style.borderColor = 'var(--brand-primary)';
      });

      elements.imageDropzone.addEventListener('dragleave', () => {
        elements.imageDropzone.style.borderColor = '';
      });

      elements.imageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imageDropzone.style.borderColor = '';
        if (e.dataTransfer.files) {
          handleImageFiles(e.dataTransfer.files);
        }
      });
    }

    if (elements.productImageFileInput) {
      elements.productImageFileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          handleImageFiles(e.target.files);
        }
      });
    }

    if (elements.btnAddImageUrl) {
      elements.btnAddImageUrl.addEventListener('click', () => {
        const url = elements.productImageUrlInput.value.trim();
        if (url) {
          state.uploadedImages.push(url);
          elements.productImageUrlInput.value = '';
          renderImagePreviews();
        }
      });
    }

    // Category Events
    if (elements.btnOpenAddCategory) elements.btnOpenAddCategory.addEventListener('click', addCategoryPrompt);

    // Settings Events
    if (elements.btnSaveSettings) elements.btnSaveSettings.addEventListener('click', saveSettings);

    // Sync Events
    if (elements.btnCopyJson) elements.btnCopyJson.addEventListener('click', copyJsonToClipboard);
    if (elements.btnDownloadJson) elements.btnDownloadJson.addEventListener('click', downloadJsonFile);
    if (elements.importJsonFileInput) elements.importJsonFileInput.addEventListener('change', handleImportJsonFile);
    if (elements.btnResetDefaults) elements.btnResetDefaults.addEventListener('click', resetFactoryDefaults);
  }

  // Expose global methods
  window.EiTohAdmin = {
    submitPin,
    lockSession,
    editProduct,
    deleteProduct,
    duplicateProduct,
    removeImage: (index) => {
      state.uploadedImages.splice(index, 1);
      renderImagePreviews();
    },
    deleteCategory
  };

  // Start Auth Check
  checkAuth();
});
