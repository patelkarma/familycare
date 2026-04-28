import api from './axiosInstance';

export const authApi = {
  register: (data) => api.post('/api/auth/register', data).then((res) => res.data),
  login: (data) => api.post('/api/auth/login', data).then((res) => res.data),
  getMe: () => api.get('/api/auth/me').then((res) => res.data),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api
      .post('/api/auth/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => res.data);
  },
  getWhatsAppJoinInfo: () =>
    api.get('/api/auth/whatsapp-join-info').then((res) => res.data),
};
