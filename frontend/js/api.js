// Central API configuration and request wrapper
const API_BASE = '/api';

const API = {
  getToken: () => localStorage.getItem('token'),
  getUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },
  
  setToken: (token) => localStorage.setItem('token', token),
  setUser: (user) => localStorage.setItem('user', JSON.stringify(user)),
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    window.location.href = '/login.html';
  },

  request: async (endpoint, options = {}) => {
    const token = API.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        // If unauthorized, auto-logout
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
          console.warn('Session expired or invalid token. Logging out.');
          API.logout();
        }
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error);
      throw error;
    }
  },

  get: (endpoint, options = {}) => API.request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) => API.request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options = {}) => API.request(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options = {}) => API.request(endpoint, { ...options, method: 'DELETE' })
};

// Expose globally
window.API = API;
