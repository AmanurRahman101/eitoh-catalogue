/**
 * EiToh Unified API Client
 * Seamlessly interfaces with Node.js / MySQL backend
 */
(function(window) {
  'use strict';

  const TOKEN_KEY = 'eitoh_auth_token';
  const USER_KEY = 'eitoh_user_profile';

  // Determine API base URL (relative if served by Express, or explicit fallback)
  const API_BASE = window.location.origin.includes('localhost') 
    ? `${window.location.origin}/api`
    : '/api';

  async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const contentType = response.headers.get('content-type');
      let data = {};
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.warn(`[EiToh API] Error at ${endpoint}:`, err.message);
      throw err;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.dispatchEvent(new CustomEvent('eitoh:auth-change', { detail: { user: null } }));
  }

  const EiTohAPI = {
    // Auth
    auth: {
      async register(userData) {
        const res = await request('/auth/register', {
          method: 'POST',
          body: JSON.stringify(userData)
        });
        if (res.token) {
          setToken(res.token);
          setUser(res.user);
          window.dispatchEvent(new CustomEvent('eitoh:auth-change', { detail: { user: res.user } }));
        }
        return res;
      },

      async login(email, password) {
        const res = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (res.token) {
          setToken(res.token);
          setUser(res.user);
          window.dispatchEvent(new CustomEvent('eitoh:auth-change', { detail: { user: res.user } }));
        }
        return res;
      },

      async getMe() {
        const token = getToken();
        if (!token) return null;
        try {
          const res = await request('/auth/me');
          if (res.user) {
            setUser(res.user);
            return res.user;
          }
        } catch (err) {
          logout();
        }
        return null;
      },

      async updateProfile(profileData) {
        const res = await request('/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(profileData)
        });
        if (res.user) {
          setUser(res.user);
          window.dispatchEvent(new CustomEvent('eitoh:auth-change', { detail: { user: res.user } }));
        }
        return res;
      },

      getToken,
      getUser,
      logout,
      isAuthenticated() {
        return Boolean(getToken());
      }
    },

    // Products & Categories
    products: {
      async getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.search) params.append('search', filters.search);
        if (filters.sort) params.append('sort', filters.sort);
        if (filters.featured) params.append('featured', filters.featured);
        
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await request(`/products${qs}`);
      },

      async getById(id) {
        return await request(`/products/${encodeURIComponent(id)}`);
      },

      async getCategories() {
        return await request('/products/categories');
      }
    },

    // Orders
    orders: {
      async create(orderData) {
        return await request('/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      },

      async getMyOrders() {
        return await request('/orders/my-orders');
      },

      async track(orderNumber) {
        return await request(`/orders/track/${encodeURIComponent(orderNumber)}`);
      }
    },

    // Quotes
    quotes: {
      async submit(quoteData) {
        return await request('/quotes', {
          method: 'POST',
          body: JSON.stringify(quoteData)
        });
      },

      async getMyQuotes() {
        return await request('/quotes/my-quotes');
      }
    },

    // Coupons
    coupons: {
      async validate(code, subtotal) {
        return await request('/admin/coupons/validate', {
          method: 'POST',
          body: JSON.stringify({ code, subtotal })
        });
      }
    },

    // Admin
    admin: {
      async getAnalytics() {
        return await request('/admin/analytics');
      },

      async getOrders(filters = {}) {
        const params = new URLSearchParams();
        if (filters.status) params.append('status', filters.status);
        if (filters.search) params.append('search', filters.search);
        const qs = params.toString() ? `?${params.toString()}` : '';
        return await request(`/orders/admin/all${qs}`);
      },

      async updateOrderStatus(orderId, status, notes = '') {
        return await request(`/orders/admin/${orderId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, notes })
        });
      },

      async getQuotes() {
        return await request('/quotes/admin/all');
      },

      async updateQuoteStatus(quoteId, status) {
        return await request(`/quotes/admin/${quoteId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
      },

      async createProduct(productData) {
        return await request('/products/admin', {
          method: 'POST',
          body: JSON.stringify(productData)
        });
      },

      async updateProduct(id, productData) {
        return await request(`/products/admin/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify(productData)
        });
      },

      async deleteProduct(id) {
        return await request(`/products/admin/${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      },

      async getCoupons() {
        return await request('/admin/coupons');
      },

      async createCoupon(couponData) {
        return await request('/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(couponData)
        });
      },

      async deleteCoupon(id) {
        return await request(`/admin/coupons/${id}`, {
          method: 'DELETE'
        });
      },

      async getSettings() {
        return await request('/admin/settings');
      },

      async updateSettings(settings) {
        return await request('/admin/settings', {
          method: 'PUT',
          body: JSON.stringify({ settings })
        });
      }
    }
  };

  window.EiTohAPI = EiTohAPI;
})(window);
