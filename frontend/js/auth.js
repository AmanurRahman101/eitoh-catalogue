/**
 * EiToh User Authentication & Customer Account Manager
 * Controls Auth Modal, Top Navigation profile widget, and "My Orders" customer portal
 */
(function(window) {
  'use strict';

  let currentUser = null;

  async function initAuth() {
    currentUser = EiTohAPI.auth.getUser();
    renderHeaderAuth();

    // Verify token with backend
    if (EiTohAPI.auth.isAuthenticated()) {
      try {
        const freshUser = await EiTohAPI.auth.getMe();
        if (freshUser) {
          currentUser = freshUser;
          renderHeaderAuth();
          prefillCheckout();
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    }

    bindAuthEvents();
    window.addEventListener('eitoh:auth-change', (e) => {
      currentUser = e.detail?.user || null;
      renderHeaderAuth();
      prefillCheckout();
    });
  }

  function renderHeaderAuth() {
    const container = document.getElementById('authNavContainer');
    if (!container) return;

    if (!currentUser) {
      container.innerHTML = `
        <button type="button" class="btn-header-action btn-auth-trigger" id="btnOpenAuthModal" title="Sign In or Register">
          <i class="fa-regular fa-user"></i>
          <span class="auth-btn-text">Sign In</span>
        </button>
      `;
      document.getElementById('btnOpenAuthModal')?.addEventListener('click', () => openAuthModal('signin'));
    } else {
      const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'U';
      const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Account';

      container.innerHTML = `
        <div class="user-menu-wrapper" id="userMenuWrapper">
          <button type="button" class="btn-user-pill" id="userMenuBtn" aria-expanded="false" title="My Account">
            <span class="user-avatar-badge">${initials}</span>
            <span class="user-name-text hide-mobile">${window.E ? window.E(firstName) : firstName}</span>
            <i class="fa-solid fa-chevron-down chevron-icon"></i>
          </button>

          <div class="user-dropdown" id="userDropdown" style="display: none;">
            <div class="user-dropdown-header">
              <div class="dropdown-name">${window.E ? window.E(currentUser.name) : currentUser.name}</div>
              <div class="dropdown-email">${window.E ? window.E(currentUser.email) : currentUser.email}</div>
              <span class="user-role-badge ${currentUser.role === 'admin' ? 'badge-admin' : ''}">${currentUser.role.toUpperCase()}</span>
            </div>
            <div class="user-dropdown-body">
              <button type="button" class="dropdown-item" id="navMyOrdersBtn">
                <i class="fa-solid fa-box-archive"></i>
                <span>My Orders</span>
              </button>
              <button type="button" class="dropdown-item" id="navProfileBtn">
                <i class="fa-solid fa-map-location-dot"></i>
                <span>Delivery Address</span>
              </button>
              ${currentUser.role === 'admin' ? `
                <a href="admin.html" class="dropdown-item item-admin">
                  <i class="fa-solid fa-sliders"></i>
                  <span>Studio CMS Panel</span>
                </a>
              ` : ''}
              <hr class="dropdown-divider">
              <button type="button" class="dropdown-item item-logout" id="navLogoutBtn">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Dropdown toggle
      const btn = document.getElementById('userMenuBtn');
      const menu = document.getElementById('userDropdown');
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.style.display === 'block';
        menu.style.display = isOpen ? 'none' : 'block';
        btn.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', () => {
        if (menu) menu.style.display = 'none';
      });

      document.getElementById('navMyOrdersBtn')?.addEventListener('click', () => openMyOrdersModal());
      document.getElementById('navProfileBtn')?.addEventListener('click', () => openProfileModal());
      document.getElementById('navLogoutBtn')?.addEventListener('click', () => {
        EiTohAPI.auth.logout();
        if (window.showToast) window.showToast('You have signed out.', 'info');
      });
    }
  }

  function openAuthModal(defaultTab = 'signin') {
    const modal = document.getElementById('authModal');
    if (!modal) return;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    switchAuthTab(defaultTab);
  }

  function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function switchAuthTab(tab) {
    const signinForm = document.getElementById('authSigninForm');
    const signupForm = document.getElementById('authSignupForm');
    const tabSignin = document.getElementById('tabAuthSignin');
    const tabSignup = document.getElementById('tabAuthSignup');
    const alertBox = document.getElementById('authAlertBox');
    if (alertBox) alertBox.style.display = 'none';

    if (tab === 'signup') {
      signinForm.style.display = 'none';
      signupForm.style.display = 'block';
      tabSignin.classList.remove('active');
      tabSignup.classList.add('active');
    } else {
      signinForm.style.display = 'block';
      signupForm.style.display = 'none';
      tabSignin.classList.add('active');
      tabSignup.classList.remove('active');
    }
  }

  function showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlertBox');
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `auth-alert ${type}`;
    alertBox.style.display = 'block';
  }

  function bindAuthEvents() {
    // Tab clicks
    document.getElementById('tabAuthSignin')?.addEventListener('click', () => switchAuthTab('signin'));
    document.getElementById('tabAuthSignup')?.addEventListener('click', () => switchAuthTab('signup'));
    document.getElementById('closeAuthModalBtn')?.addEventListener('click', closeAuthModal);
    document.getElementById('authModalBackdrop')?.addEventListener('click', closeAuthModal);

    // Switch links inside forms
    document.getElementById('linkGoToSignup')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('signup');
    });
    document.getElementById('linkGoToSignin')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('signin');
    });

    // Sign In Submission
    document.getElementById('authSigninForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signinEmail').value.trim();
      const password = document.getElementById('signinPassword').value;
      const btn = document.getElementById('btnSubmitSignin');

      if (!email || !password) {
        showAuthAlert('Please enter both email and password.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing In...';

      try {
        const res = await EiTohAPI.auth.login(email, password);
        closeAuthModal();
        if (window.showToast) window.showToast(`Welcome back, ${res.user.name}! 👋`, 'success');
      } catch (err) {
        showAuthAlert(err.message || 'Login failed. Please check your credentials.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Sign In to EiToh';
      }
    });

    // Sign Up Submission
    document.getElementById('authSignupForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const phone = document.getElementById('signupPhone').value.trim();
      const password = document.getElementById('signupPassword').value;
      const address = document.getElementById('signupAddress').value.trim();
      const city = document.getElementById('signupCity').value.trim() || 'Dhaka';
      const btn = document.getElementById('btnSubmitSignup');

      if (!name || !email || !phone || !password) {
        showAuthAlert('Please fill in all required fields.');
        return;
      }

      // Bangladeshi Phone Regex Validation
      const cleanPhone = phone.replace(/[\s-]/g, '');
      if (!/^(?:\+8801|01)[3-9]\d{8}$/.test(cleanPhone)) {
        showAuthAlert('Please enter a valid 11-digit Bangladeshi phone number (e.g. 017XXXXXXXX).');
        return;
      }

      // RFC Email Validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showAuthAlert('Please enter a valid email address (e.g. name@example.com).');
        return;
      }

      if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters long.');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';

      try {
        const res = await EiTohAPI.auth.register({
          name,
          email,
          phone: cleanPhone,
          password,
          address,
          city,
          district: city
        });
        closeAuthModal();
        if (window.showToast) window.showToast(`Account created! Welcome, ${res.user.name}. 🎉`, 'success');
      } catch (err) {
        showAuthAlert(err.message || 'Registration failed.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Create Account';
      }
    });
  }

  function prefillCheckout() {
    if (!currentUser) return;
    const nameInput = document.getElementById('checkoutCustomerName');
    const phoneInput = document.getElementById('checkoutCustomerPhone');
    const addressInput = document.getElementById('checkoutCustomerAddress');
    const emailInput = document.getElementById('checkoutCustomerEmail');

    if (nameInput && !nameInput.value) nameInput.value = currentUser.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = currentUser.phone || '';
    if (addressInput && !addressInput.value) addressInput.value = currentUser.address || '';
    if (emailInput && !emailInput.value) emailInput.value = currentUser.email || '';
  }

  async function openMyOrdersModal() {
    const modal = document.getElementById('myOrdersModal');
    const list = document.getElementById('myOrdersList');
    if (!modal || !list) return;

    const E = window.EiTohUtils?.escapeHTML || (s => String(s || ''));

    modal.classList.add('active');
    list.innerHTML = `
      <div class="orders-loading-state">
        <i class="fa-solid fa-circle-notch fa-spin"></i>
        <p>Loading your orders from studio database...</p>
      </div>
    `;

    try {
      const res = await EiTohAPI.orders.getMyOrders();
      if (!res.orders || res.orders.length === 0) {
        list.innerHTML = `
          <div class="orders-empty-state">
            <i class="fa-solid fa-box-open" style="font-size: 2.4rem; color: #94a3b8; margin-bottom: 12px;"></i>
            <h3>No Orders Yet</h3>
            <p>You haven't placed any custom print orders with this account yet.</p>
            <button type="button" class="btn-primary" onclick="document.getElementById('myOrdersModal').classList.remove('active'); window.scrollTo({top: 600, behavior:'smooth'});">
              Explore Creations
            </button>
          </div>
        `;
        return;
      }

      list.innerHTML = res.orders.map(order => {
        const dateStr = new Date(order.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });

        const safeStatus = E(order.order_status || 'confirmed');
        const statusClass = `badge-status-${safeStatus.toLowerCase()}`;
        const itemsHtml = (order.items || []).map(it => `
          <div class="order-item-row">
            <span class="order-item-title">${E(it.product_title)} × ${Number(it.quantity || 1)}</span>
            <span class="order-item-price">৳${parseFloat(it.total_price || 0).toLocaleString()}</span>
          </div>
        `).join('');

        const safeOrderNum = E(order.order_number);

        return `
          <div class="customer-order-card">
            <div class="order-card-header">
              <div>
                <span class="order-num-tag">${safeOrderNum}</span>
                <span class="order-date-text"><i class="fa-regular fa-clock"></i> ${E(dateStr)}</span>
              </div>
              <span class="order-status-pill ${statusClass}">
                <span class="pulse-dot"></span> ${safeStatus.toUpperCase()}
              </span>
            </div>

            <div class="order-card-items">
              ${itemsHtml}
            </div>

            <div class="order-card-footer">
              <div class="order-total-summary">
                <span class="total-label">Total Amount:</span>
                <span class="total-val">৳${parseFloat(order.total_amount).toLocaleString()}</span>
              </div>
              <button type="button" class="btn-track-order-modal" onclick="window.EiTohAuth.trackOrder('${safeOrderNum}')">
                <i class="fa-solid fa-route"></i> Track Live
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `
        <div class="orders-empty-state">
          <i class="fa-solid fa-triangle-exclamation" style="color: #ef4444; font-size: 2rem;"></i>
          <p>Failed to retrieve orders: ${err.message}</p>
        </div>
      `;
    }
  }

  function trackOrder(orderNumber) {
    document.getElementById('myOrdersModal')?.classList.remove('active');
    const trackerModal = document.getElementById('trackerModal');
    const trackerInput = document.getElementById('trackerInput');
    if (trackerModal && trackerInput) {
      trackerInput.value = orderNumber;
      trackerModal.classList.add('active');
      document.getElementById('trackerSearchBtn')?.click();
    }
  }

  function openProfileModal() {
    if (!currentUser) return;
    openAuthModal('signin'); // or address prompt
  }

  window.EiTohAuth = {
    init: initAuth,
    openModal: openAuthModal,
    closeModal: closeAuthModal,
    openMyOrders: openMyOrdersModal,
    trackOrder,
    getCurrentUser: () => currentUser
  };

  document.addEventListener('DOMContentLoaded', initAuth);
})(window);
