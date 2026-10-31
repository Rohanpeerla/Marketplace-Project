/**
 * MarketHub API Service Client
 * Handles token storage, authorization headers, and unified HTTP requests.
 */

const TOKEN_KEY = 'markethub_auth_token';

// Resolve base API URL (supports Vite env or falls back to port 5000)
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
};

/**
 * Retrieve saved JWT from local storage
 * @returns {string|null}
 */
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

/**
 * Save JWT to local storage
 * @param {string} token
 */
export const storeToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to access localStorage:', err);
  }
};

/**
 * Clear stored JWT from local storage
 */
export const clearStoredToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error('Failed to clear localStorage:', err);
  }
};

/**
 * Authenticated fetch wrapper. Automatically attaches Bearer token header.
 * @param {string} endpoint - Path such as '/api/auth/me'
 * @param {RequestInit} [options={}]
 * @returns {Promise<Response>}
 */
export const fetchWithAuth = async (endpoint, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});

  // Add JSON Content-Type if sending a body and not FormData
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach JWT Bearer token if available
  const token = getStoredToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Helper to process JSON responses safely
 */
const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }
  return data;
};

/**
 * Authentication API methods
 */
export const authApi = {
  register: async (userData) => {
    const res = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  login: async ({ email, password }) => {
    const res = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetchWithAuth('/api/auth/me');
    return handleResponse(res);
  },

  testEndpoint: async (path) => {
    const res = await fetchWithAuth(path);
    const data = await res.json().catch(() => ({}));
    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  },
};

/**
 * Category Management API methods
 */
export const categoryApi = {
  getAll: async () => {
    const res = await fetchWithAuth('/api/categories');
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetchWithAuth(`/api/categories/${id}`);
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetchWithAuth('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id, data) => {
    const res = await fetchWithAuth(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id) => {
    const res = await fetchWithAuth(`/api/categories/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

/**
 * Product Management API methods
 */
export const productApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.categoryId) query.set('category_id', params.categoryId);
    if (params.vendorId) query.set('vendor_id', params.vendorId);
    if (params.minPrice) query.set('min_price', params.minPrice);
    if (params.maxPrice) query.set('max_price', params.maxPrice);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/products?${queryString}` : '/api/products';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  getById: async (id) => {
    const res = await fetchWithAuth(`/api/products/${id}`);
    return handleResponse(res);
  },

  create: async (data) => {
    const res = await fetchWithAuth('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  update: async (id, data) => {
    const res = await fetchWithAuth(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  delete: async (id) => {
    const res = await fetchWithAuth(`/api/products/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  addImage: async (productId, imageData) => {
    const res = await fetchWithAuth(`/api/products/${productId}/images`, {
      method: 'POST',
      body: JSON.stringify(imageData),
    });
    return handleResponse(res);
  },

  removeImage: async (productId, imageId) => {
    const res = await fetchWithAuth(`/api/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

/**
 * Vendor Profile API methods
 */
export const vendorApi = {
  getMe: async () => {
    const res = await fetchWithAuth('/api/vendors/me');
    return handleResponse(res);
  },

  updateMe: async (data) => {
    const res = await fetchWithAuth('/api/vendors/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  listAll: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    const queryString = query.toString();
    const endpoint = queryString ? `/api/vendors?${queryString}` : '/api/vendors';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },
};

/**
 * Search API methods (Elasticsearch product search, filter, sort, paginate)
 */
export const searchApi = {
  searchProducts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category_id) query.set('category_id', params.category_id);
    if (params.vendor_id) query.set('vendor_id', params.vendor_id);
    if (params.min_price !== undefined && params.min_price !== '') query.set('min_price', params.min_price);
    if (params.max_price !== undefined && params.max_price !== '') query.set('max_price', params.max_price);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/search/products?${queryString}` : '/api/search/products';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  getHealth: async () => {
    const res = await fetchWithAuth('/api/health/search');
    return handleResponse(res);
  },
};

/**
 * Shopping Cart API methods (Redis + PostgreSQL)
 */
export const cartApi = {
  getCart: async () => {
    const res = await fetchWithAuth('/api/cart');
    return handleResponse(res);
  },

  addItem: async (productId, quantity = 1) => {
    const res = await fetchWithAuth('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
    return handleResponse(res);
  },

  updateItem: async (productId, quantity) => {
    const res = await fetchWithAuth(`/api/cart/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
    return handleResponse(res);
  },

  removeItem: async (productId) => {
    const res = await fetchWithAuth(`/api/cart/items/${productId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  clearCart: async () => {
    const res = await fetchWithAuth('/api/cart', {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

/**
 * Customer Orders & Checkout API methods (Stage 7)
 */
export const orderApi = {
  checkout: async (shippingData) => {
    const res = await fetchWithAuth('/api/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(shippingData),
    });
    return handleResponse(res);
  },

  getOrders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/orders?${queryString}` : '/api/orders';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  getOrderById: async (orderId) => {
    const res = await fetchWithAuth(`/api/orders/${orderId}`);
    return handleResponse(res);
  },

  cancelOrder: async (orderId) => {
    const res = await fetchWithAuth(`/api/orders/${orderId}/cancel`, {
      method: 'PUT',
    });
    return handleResponse(res);
  },
};

/**
 * Vendor Orders Management API methods (Stage 7)
 */
export const vendorOrderApi = {
  getOrders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/vendor/orders?${queryString}` : '/api/vendor/orders';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  getOrderById: async (orderId) => {
    const res = await fetchWithAuth(`/api/vendor/orders/${orderId}`);
    return handleResponse(res);
  },

  updateStatus: async (orderId, status) => {
    const res = await fetchWithAuth(`/api/vendor/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },
};

/**
 * Admin Orders Overview API methods (Stage 7)
 */
export const adminOrderApi = {
  getOrders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status) query.set('status', params.status);

    const queryString = query.toString();
    const endpoint = queryString ? `/api/admin/orders?${queryString}` : '/api/admin/orders';
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  getOrderById: async (orderId) => {
    const res = await fetchWithAuth(`/api/admin/orders/${orderId}`);
    return handleResponse(res);
  },
};

/**
 * Razorpay Test Mode Payment API methods (Stage 8)
 */
export const paymentApi = {
  createOrder: async (data) => {
    const res = await fetchWithAuth('/api/payments/create-order', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  verify: async (data) => {
    const res = await fetchWithAuth('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  simulateSuccess: async (data) => {
    const res = await fetchWithAuth('/api/payments/simulate-success', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  fail: async (data) => {
    const res = await fetchWithAuth('/api/payments/fail', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  getByOrder: async (orderId) => {
    const res = await fetchWithAuth(`/api/payments/order/${orderId}`);
    return handleResponse(res);
  },

  getConfig: async () => {
    const res = await fetchWithAuth('/api/payments/config');
    return handleResponse(res);
  },
};

/**
 * Product Reviews API methods (Stage 9)
 */
export const reviewApi = {
  getProductReviews: async (productId, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const endpoint = `/api/products/${productId}/reviews${qs ? `?${qs}` : ''}`;
    const res = await fetchWithAuth(endpoint);
    return handleResponse(res);
  },

  createReview: async ({ productId, rating, comment }) => {
    const res = await fetchWithAuth('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ productId, rating, comment }),
    });
    return handleResponse(res);
  },

  updateReview: async (id, { rating, comment }) => {
    const res = await fetchWithAuth(`/api/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ rating, comment }),
    });
    return handleResponse(res);
  },

  deleteReview: async (id) => {
    const res = await fetchWithAuth(`/api/reviews/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

/**
 * Coupons API methods (Stage 9)
 */
export const couponApi = {
  validate: async (code, orderAmount) => {
    const res = await fetchWithAuth('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount }),
    });
    return handleResponse(res);
  },

  getCoupons: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetchWithAuth(`/api/coupons${qs ? `?${qs}` : ''}`);
    return handleResponse(res);
  },

  createCoupon: async (couponData) => {
    const res = await fetchWithAuth('/api/coupons', {
      method: 'POST',
      body: JSON.stringify(couponData),
    });
    return handleResponse(res);
  },

  updateCoupon: async (id, couponData) => {
    const res = await fetchWithAuth(`/api/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(couponData),
    });
    return handleResponse(res);
  },

  deleteCoupon: async (id) => {
    const res = await fetchWithAuth(`/api/coupons/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

/**
 * PDF Invoice API methods (Stage 9)
 */
export const invoiceApi = {
  downloadInvoice: async (orderId, invoiceNumber = null) => {
    const baseUrl = getApiBaseUrl();
    const token = getStoredToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/api/orders/${orderId}/invoice`, {
      method: 'GET',
      headers,
    });

    if (!res.ok) {
      let errMsg = 'Failed to download invoice';
      try {
        const errJson = await res.json();
        errMsg = errJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = invoiceNumber ? `invoice-${invoiceNumber}.pdf` : `invoice-${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

/**
 * Admin Analytics API methods (Stage 9)
 */
export const analyticsApi = {
  getOverview: async () => {
    const res = await fetchWithAuth('/api/admin/analytics/overview');
    return handleResponse(res);
  },

  getRevenue: async () => {
    const res = await fetchWithAuth('/api/admin/analytics/revenue');
    return handleResponse(res);
  },

  getOrders: async () => {
    const res = await fetchWithAuth('/api/admin/analytics/orders');
    return handleResponse(res);
  },

  getProducts: async () => {
    const res = await fetchWithAuth('/api/admin/analytics/products');
    return handleResponse(res);
  },

  getVendors: async () => {
    const res = await fetchWithAuth('/api/admin/analytics/vendors');
    return handleResponse(res);
  },
};
