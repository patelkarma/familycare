import api from './axiosInstance';

export const vitalsApi = {
  getByMember: (memberId, type, days = 30) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('days', days);
    return api.get(`/api/vitals/member/${memberId}?${params}`).then((res) => res.data);
  },
  getLatest: (memberId) => api.get(`/api/vitals/member/${memberId}/latest`).then((res) => res.data),
  add: (data) => api.post('/api/vitals', data).then((res) => res.data),
  delete: (id) => api.delete(`/api/vitals/${id}`).then((res) => res.data),
};
