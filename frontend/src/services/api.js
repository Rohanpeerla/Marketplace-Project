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

  // Add JSON Content-Type if sending a body
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
 * Authentication API methods
 */
export const authApi = {
  /**
   * Register a customer or vendor
   */
  register: async (userData) => {
    const res = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Registration failed (HTTP ${res.status})`);
    }
    return data;
  },

  /**
   * Authenticate user credentials
   */
  login: async ({ email, password }) => {
    const res = await fetchWithAuth('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Login failed (HTTP ${res.status})`);
    }
    return data;
  },

  /**
   * Fetch current user profile
   */
  getMe: async () => {
    const res = await fetchWithAuth('/api/auth/me');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Profile request failed (HTTP ${res.status})`);
    }
    return data;
  },

  /**
   * Test role-protected endpoints
   */
  testEndpoint: async (path) => {
    const res = await fetchWithAuth(path);
    const data = await res.json();
    return {
      status: res.status,
      ok: res.ok,
      data,
    };
  },
};
