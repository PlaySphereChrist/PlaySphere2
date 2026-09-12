/**
 * Minimal reusable API utility for fetching data.
 * Injects JWT auth token into headers if available.
 */
const BASE_URL = '/api';

export const api = {
  getToken: () => localStorage.getItem('accessToken'),
  
  async request(method, endpoint, body = null) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || 'API request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  },

  get(endpoint) { return this.request('GET', endpoint); },
  post(endpoint, body) { return this.request('POST', endpoint, body); },
  patch(endpoint, body) { return this.request('PATCH', endpoint, body); },
  delete(endpoint) { return this.request('DELETE', endpoint); }
};
