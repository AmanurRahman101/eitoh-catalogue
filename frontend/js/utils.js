/**
 * EiToh (এইতো) — Shared Utilities & Security Primitives
 * 
 * Single source of truth for all shared functions across the application.
 * Addresses audit findings: SEC-01 (XSS), SEC-02 (PIN hashing), SEC-03 (image compression),
 * ARCH-01 (code deduplication), and accessibility improvements.
 * 
 * Load order: This file MUST be loaded BEFORE data.js, app.js, and admin.js.
 */

const EiTohUtils = (() => {
  'use strict';

  // =========================================================================
  // SEC-01 FIX: HTML Entity Encoding (Prevents Stored & DOM XSS)
  // =========================================================================
  /**
   * Escapes HTML special characters to prevent XSS injection.
   * Must be used on ALL user-sourced strings before innerHTML interpolation.
   * @param {*} str - The string to sanitize
   * @returns {string} HTML-safe string
   */
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // SEC-02 FIX: Admin PIN Hashing (SHA-256 via Web Crypto API)
  // =========================================================================
  /**
   * Hashes a PIN string using SHA-256.
   * @param {string} pin - The plaintext PIN to hash
   * @returns {Promise<string>} Hex-encoded SHA-256 hash
   */
  async function hashPIN(pin) {
    const encoder = new TextEncoder();
    const data = encoder.encode(String(pin));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies a plaintext PIN against a stored SHA-256 hash.
   * @param {string} pin - The plaintext PIN entered by the user
   * @param {string} storedHash - The stored SHA-256 hex digest
   * @returns {Promise<boolean>} True if PIN matches
   */
  async function verifyPIN(pin, storedHash) {
    // Backward compatibility: if storedHash is not a 64-char hex string,
    // it's a legacy plaintext PIN — compare directly
    if (!storedHash || storedHash.length !== 64 || !/^[a-f0-9]{64}$/.test(storedHash)) {
      return String(pin) === String(storedHash);
    }
    const inputHash = await hashPIN(pin);
    return inputHash === storedHash;
  }

  // =========================================================================
  // SEC-03 FIX: Image Compression via HTML5 Canvas
  // =========================================================================
  /**
   * Compresses an image File to a Base64 JPEG string with size constraints.
   * Prevents localStorage quota exhaustion from large camera photos.
   * @param {File} file - The image file to compress
   * @param {Object} opts - Options
   * @param {number} [opts.maxWidth=1000] - Maximum output width in pixels
   * @param {number} [opts.maxHeight=1000] - Maximum output height in pixels
   * @param {number} [opts.quality=0.72] - JPEG quality (0.0 to 1.0)
   * @returns {Promise<string>} Compressed Base64 data URL (JPEG)
   */
  function compressImage(file, opts = {}) {
    const maxWidth = opts.maxWidth || 1000;
    const maxHeight = opts.maxHeight || 1000;
    const quality = opts.quality || 0.72;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.onload = () => {
          // Calculate scaled dimensions maintaining aspect ratio
          let { width, height } = img;
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }

          // Draw to canvas and re-encode as compressed JPEG
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // ARCH-01 FIX: Unified Toast Notification System
  // =========================================================================
  /**
   * Shows a toast notification. Supports either showToast(container, message)
   * or showToast(message, type/icon).
   * @param {HTMLElement|string} arg1 - Container element OR message string
   * @param {string} [arg2] - Message string (if arg1 is element) OR type ('warning'/'error'/'success')
   * @param {string} [icon='fa-circle-check'] - FontAwesome icon class
   * @param {number} [duration=3000] - Duration in ms before auto-removal
   */
  function showToast(arg1, arg2, icon = 'fa-circle-check', duration = 3000) {
    let container;
    let message;
    let toastIcon = icon;

    if (arg1 instanceof HTMLElement) {
      container = arg1;
      message = arg2;
    } else {
      message = String(arg1 || '');
      if (typeof arg2 === 'string') {
        if (arg2 === 'warning') toastIcon = 'fa-triangle-exclamation';
        else if (arg2 === 'error') toastIcon = 'fa-circle-xmark';
        else toastIcon = arg2;
      }
      container = document.getElementById('toastContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }
    }

    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid ${escapeHTML(toastIcon)}"></i> <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // =========================================================================
  // ARCH-01 FIX: Centralized WhatsApp URL Builder
  // =========================================================================
  /**
   * Builds a WhatsApp click-to-chat URL. Supports plain text or structured order objects.
   * @param {string} phoneNumber - Phone number (digits only or with country code)
   * @param {string|Object} messageOrOrder - Pre-filled message text OR order object
   * @param {Object} [settings={}] - Store settings for currency formatting
   * @returns {string} Complete wa.me URL
   */
  function buildWhatsAppURL(phoneNumber, messageOrOrder, settings = {}) {
    const cleanNumber = String(phoneNumber || '').replace(/[^0-9]/g, '');
    let msgText = '';

    if (typeof messageOrOrder === 'object' && messageOrOrder !== null) {
      const order = messageOrOrder;
      const currency = settings.currency || '৳';
      msgText = `🛒 *NEW ORDER — EiToh (এইতো)*\n`;
      msgText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msgText += `🔖 *Order ID:* ${order.id}\n`;
      msgText += `👤 *Customer:* ${order.customer?.name || 'Customer'}\n`;
      msgText += `📞 *Phone:* ${order.customer?.phone || ''}\n`;
      msgText += `📍 *Delivery:* ${order.customer?.address || 'Dhaka'}\n`;
      if (order.customer?.notes) {
        msgText += `📝 *Notes:* ${order.customer.notes}\n`;
      }
      msgText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msgText += `📦 *Ordered Items:*\n`;
      (order.items || []).forEach((it, idx) => {
        msgText += `${idx + 1}. *${it.title}* (${it.selectedColor || 'Standard'}) × ${it.quantity} = ${currency} ${it.price * it.quantity}\n`;
      });
      msgText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msgText += `💵 *Subtotal:* ${currency} ${order.subtotal}\n`;
      if (order.discount) {
        msgText += `🏷️ *Discount (${order.couponCode || 'PROMO'}):* -${currency} ${order.discount}\n`;
      }
      msgText += `🚚 *Delivery Fee:* ${order.deliveryFee === 0 ? 'FREE' : `${currency} ${order.deliveryFee}`}\n`;
      msgText += `💰 *TOTAL PAYABLE:* *${currency} ${order.total}*\n`;
      msgText += `━━━━━━━━━━━━━━━━━━━━━\n`;
      msgText += `✨ _Order registered in EiToh Studio queue. Please confirm dispatch timing._`;
    } else {
      msgText = String(messageOrOrder || '');
    }

    const encodedMsg = encodeURIComponent(msgText);
    return `https://wa.me/${cleanNumber}?text=${encodedMsg}`;
  }

  // =========================================================================
  // ACCESSIBILITY: Modal Focus Trapping
  // =========================================================================
  let _previousFocusElement = null;
  const FOCUSABLE_SELECTORS = 'a[href], button:not([disabled]), textarea, input:not([disabled]), select, [tabindex]:not([tabindex="-1"])';

  /**
   * Traps keyboard focus within a modal element.
   * @param {HTMLElement} modalElement - The modal/dialog element to trap focus within
   */
  function trapFocus(modalElement) {
    if (!modalElement) return;
    _previousFocusElement = document.activeElement;

    const focusableChildren = modalElement.querySelectorAll(FOCUSABLE_SELECTORS);
    if (focusableChildren.length === 0) return;

    const firstFocusable = focusableChildren[0];
    const lastFocusable = focusableChildren[focusableChildren.length - 1];

    // Focus the first interactive element
    firstFocusable.focus();

    // Store the handler so we can remove it later
    modalElement._focusTrapHandler = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    modalElement.addEventListener('keydown', modalElement._focusTrapHandler);
  }

  /**
   * Releases focus trap and restores focus to the previously focused element.
   * @param {HTMLElement} modalElement - The modal element that had focus trapped
   */
  function restoreFocus(modalElement) {
    if (modalElement && modalElement._focusTrapHandler) {
      modalElement.removeEventListener('keydown', modalElement._focusTrapHandler);
      delete modalElement._focusTrapHandler;
    }
    if (_previousFocusElement && typeof _previousFocusElement.focus === 'function') {
      _previousFocusElement.focus();
      _previousFocusElement = null;
    }
  }

  // =========================================================================
  // ACCESSIBILITY: Screen Reader Announcements (aria-live)
  // =========================================================================
  let _announcer = null;

  /**
   * Announces a message to screen readers via an aria-live region.
   * Creates the announcer element on first call if it doesn't exist.
   * @param {string} message - The message to announce
   * @param {string} [priority='polite'] - 'polite' or 'assertive'
   */
  function announce(message, priority = 'polite') {
    if (!_announcer) {
      _announcer = document.getElementById('srAnnouncer');
      if (!_announcer) {
        _announcer = document.createElement('div');
        _announcer.id = 'srAnnouncer';
        _announcer.className = 'sr-only';
        _announcer.setAttribute('aria-live', priority);
        _announcer.setAttribute('aria-atomic', 'true');
        _announcer.setAttribute('role', 'status');
        document.body.appendChild(_announcer);
      }
    }
    _announcer.setAttribute('aria-live', priority);
    // Clear and set with a small delay to ensure screen readers pick up repeated messages
    _announcer.textContent = '';
    requestAnimationFrame(() => {
      _announcer.textContent = message;
    });
  }

  // =========================================================================
  // UTILITY: Debounce
  // =========================================================================
  /**
   * Creates a debounced version of a function.
   * @param {Function} fn - The function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // =========================================================================
  // UTILITY: Date Formatting
  // =========================================================================
  /**
   * Formats an ISO date string or timestamp into a human-readable format.
   * @param {string|number} dateInput - ISO string or timestamp
   * @param {Object} [opts] - Intl.DateTimeFormat options override
   * @returns {string} Formatted date string
   */
  function formatDate(dateInput, opts) {
    if (!dateInput) return 'N/A';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Invalid Date';
      const defaultOpts = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      return date.toLocaleString('en-US', opts || defaultOpts);
    } catch (e) {
      return String(dateInput);
    }
  }

  // =========================================================================
  // UTILITY: Generate Unique Order ID
  // =========================================================================
  /**
   * Generates a unique EiToh-style order ID.
   * Format: EITOH-XXXX (4-digit uppercase alphanumeric)
   * @returns {string} Unique order ID
   */
  function generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `EITOH-${suffix}`;
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================
  return {
    // Security
    escapeHTML,
    hashPIN,
    verifyPIN,
    compressImage,

    // UI
    showToast,
    buildWhatsAppURL,

    // Accessibility
    trapFocus,
    restoreFocus,
    announce,

    // Utilities
    debounce,
    formatDate,
    generateOrderId
  };
})();

// Make globally accessible
window.EiTohUtils = EiTohUtils;
