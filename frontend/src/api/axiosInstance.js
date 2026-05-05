import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    // 429 from the Bucket4j interceptor ships a Retry-After header (seconds).
    // Rewrite the error message so per-call onError handlers surface a useful
    // toast ("Try again in N seconds") instead of the raw "Rate limit exceeded".
    if (error.response?.status === 429) {
      const retryAfter = parseInt(error.response.headers?.['retry-after'], 10);
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        error.message = `Too many attempts. Try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`;
      } else {
        error.message = 'Too many attempts. Please wait a minute and try again.';
      }
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'Server is waking up, please try again in a moment.';
    } else if (!error.response) {
      error.message = 'Cannot reach server. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

export default api;
