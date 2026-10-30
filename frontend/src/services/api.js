/**
 * MarketHub API Service Client
 * Handles token storage, authorization headers, and unified HTTP requests.
 */

const TOKEN_KEY = 'markethub_auth_token';

// Resolve base API URL (supports Vite env or falls back to port 5000)
export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
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
