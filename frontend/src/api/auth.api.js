import api from './axiosInstance';

export const authApi = {
  register: (data) => api.post('/api/auth/register', data).then((res) => res.data),
  login: (data) => api.post('/api/auth/login', data).then((res) => res.data),
  getMe: () => api.get('/api/auth/me').then((res) => res.data),
};
