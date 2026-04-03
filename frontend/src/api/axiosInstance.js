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
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'Server is waking up, please try again in a moment.';
    } else if (!error.response) {
      error.message = 'Cannot reach server. Please check your connection.';
    }
    return Promise.reject(error);
  }
);

export default api;
