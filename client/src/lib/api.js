/* global FormData */
/**
 * PlaySphere API utility.
 * - Injects JWT access token from localStorage.
 * - Automatically attempts one silent token refresh on 401.
 * - Prevents parallel refresh storms with a promise queue.
 * - On refresh failure, clears auth state and emits 'ps:logout' event.
 */
const BASE_URL = '/api';

let refreshPromise = null;

async function tryRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Refresh failed');

    localStorage.setItem('accessToken', data.data.accessToken);
    if (data.data.refreshToken) {
      localStorage.setItem('refreshToken', data.data.refreshToken);
    }
    return data.data.accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export const api = {
  getToken: () => localStorage.getItem('accessToken'),

  async request(method, endpoint, body = null, _retry = true) {
    const headers = {};
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) {
      options.body = (body instanceof FormData) ? body : JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();

    // Attempt silent refresh on 401, then retry once
    if (response.status === 401 && _retry) {
      try {
        await tryRefresh();
        return this.request(method, endpoint, body, false);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.dispatchEvent(new window.Event('ps:logout'));
        const error = new Error('Session expired. Please log in again.');
        error.status = 401;
        throw error;
      }
    }

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
  delete(endpoint) { return this.request('DELETE', endpoint); },
};
